import type {
  Request,
  Response,
  NextFunction
} from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

type SupabaseUser = {
  id: string;
  app_metadata?: Record<string, unknown>;
};

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
      return;
    }

    const token = authorization.slice(7).trim();
    const supabaseUrl = process.env.SUPABASE_URL;
    const authApiKey =
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!token || !supabaseUrl || !authApiKey) {
      res.status(token ? 503 : 401).json({
        error: token ? "خدمة التحقق غير متاحة حالياً" : "رمز الدخول غير صالح"
      });
      return;
    }

    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        apikey: authApiKey,
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      res.status(401).json({
        error: "انتهت جلسة الدخول، سجل دخولك مرة أخرى"
      });
      return;
    }

    const user = await response.json() as SupabaseUser;
    if (!user?.id) {
      res.status(401).json({ error: "الحساب غير صالح" });
      return;
    }

    req.userId = user.id;
    const role = user.app_metadata?.role;
    req.userRole = typeof role === "string" ? role : "user";
    next();
  } catch (error) {
    console.error("Authentication error:", error instanceof Error ? error.message : "unknown");
    res.status(503).json({ error: "تعذر التحقق من الحساب حالياً" });
  }
}
