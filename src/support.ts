import { Router, type Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";

const router = Router();
router.use(requireAuth);

const supabaseUrl = () => process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

async function databaseRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(12000)
  });

  const body = await response.text();
  if (!response.ok) {
    console.error("Support database request failed:", response.status, body.slice(0, 300));
    throw new Error("DATABASE_REQUEST_FAILED");
  }
  return (body ? JSON.parse(body) : null) as T;
}

function userId(req: AuthenticatedRequest): string {
  if (!req.userId) throw new Error("AUTH_REQUIRED");
  return req.userId;
}

function isStaff(req: AuthenticatedRequest): boolean {
  return req.userRole === "admin" || req.userRole === "support";
}

function sendError(res: Response, error: unknown) {
  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  console.error("Support API error:", error instanceof Error ? error.message : "unknown");
  res.status(503).json({ error: "خدمة الدعم غير متاحة حالياً، حاول مرة أخرى" });
}

// List only the signed-in user's tickets. Staff can use the staff endpoint below.
router.get("/tickets", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await databaseRequest<unknown[]>(
      `support_tickets?select=id,subject,category,status,created_at,updated_at&user_id=eq.${encodeURIComponent(userId(req))}&order=updated_at.desc&limit=50`
    );
    res.json({ success: true, tickets: rows });
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/tickets", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subject = typeof req.body?.subject === "string" ? req.body.subject.trim().slice(0, 120) : "";
    const category = typeof req.body?.category === "string" ? req.body.category : "other";
    const allowedCategories = ["technical", "account", "subscription", "other"];

    if (subject.length < 3 || !allowedCategories.includes(category)) {
      res.status(400).json({ error: "اكتب عنواناً واضحاً واختر تصنيفاً صحيحاً" });
      return;
    }

    const rows = await databaseRequest<Array<{ id: string }>>(
      "support_tickets?select=id,subject,category,status,created_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: userId(req),
          subject,
          category,
          status: "open"
        })
      }
    );
    res.status(201).json({ success: true, ticket: rows[0] });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/tickets/:ticketId/messages", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const owner = userId(req);
    const ticketFilter = isStaff(req)
      ? `id=eq.${encodeURIComponent(req.params.ticketId)}`
      : `id=eq.${encodeURIComponent(req.params.ticketId)}&user_id=eq.${encodeURIComponent(owner)}`;

    const tickets = await databaseRequest<Array<{ id: string }>>(
      `support_tickets?select=id&${ticketFilter}&limit=1`
    );
    if (!tickets.length) {
      res.status(404).json({ error: "طلب الدعم غير موجود" });
      return;
    }

    const messages = await databaseRequest<unknown[]>(
      `support_messages?select=id,sender_role,message,created_at&ticket_id=eq.${encodeURIComponent(req.params.ticketId)}&order=created_at.asc&limit=200`
    );
    res.json({ success: true, messages });
  } catch (error) {
    sendError(res, error);
  }
});

async function addMessage(req: AuthenticatedRequest, res: Response, staffReply: boolean) {
  try {
    const sender = userId(req);
    if (staffReply && !isStaff(req)) {
      res.status(403).json({ error: "غير مسموح" });
      return;
    }

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message || message.length > 4000) {
      res.status(400).json({ error: "الرسالة مطلوبة وبحد أقصى 4000 حرف" });
      return;
    }

    const ticketFilter = staffReply
      ? `id=eq.${encodeURIComponent(req.params.ticketId)}`
      : `id=eq.${encodeURIComponent(req.params.ticketId)}&user_id=eq.${encodeURIComponent(sender)}&status=eq.open`;

    const tickets = await databaseRequest<Array<{ id: string }>>(
      `support_tickets?select=id&${ticketFilter}&limit=1`
    );
    if (!tickets.length) {
      res.status(404).json({ error: "طلب الدعم غير موجود أو مغلق" });
      return;
    }

    const rows = await databaseRequest<Array<{ id: string; created_at: string }>>(
      "support_messages?select=id,created_at",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          ticket_id: req.params.ticketId,
          sender_id: sender,
          sender_role: staffReply ? "staff" : "user",
          message
        })
      }
    );

    await databaseRequest(
      `support_tickets?id=eq.${encodeURIComponent(req.params.ticketId)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ updated_at: new Date().toISOString() })
      }
    );

    res.status(201).json({ success: true, message: rows[0] });
  } catch (error) {
    sendError(res, error);
  }
}

router.post("/tickets/:ticketId/messages", (req: AuthenticatedRequest, res: Response) =>
  addMessage(req, res, false)
);

router.get("/staff/tickets", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isStaff(req)) {
      res.status(403).json({ error: "غير مسموح" });
      return;
    }
    const rows = await databaseRequest<unknown[]>(
      "support_tickets?select=id,user_id,subject,category,status,created_at,updated_at&order=updated_at.desc&limit=100"
    );
    res.json({ success: true, tickets: rows });
  } catch (error) {
    sendError(res, error);
  }
});

router.post("/staff/tickets/:ticketId/messages", (req: AuthenticatedRequest, res: Response) =>
  addMessage(req, res, true)
);

router.patch("/staff/tickets/:ticketId/resolve", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isStaff(req)) {
      res.status(403).json({ error: "غير مسموح" });
      return;
    }
    const rows = await databaseRequest<Array<{ id: string }>>(
      `support_tickets?id=eq.${encodeURIComponent(req.params.ticketId)}&select=id`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "resolved", updated_at: new Date().toISOString() })
      }
    );
    if (!rows.length) {
      res.status(404).json({ error: "طلب الدعم غير موجود" });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
