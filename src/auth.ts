
import type {
  Request,
  Response,
  NextFunction
} from "express";

import { supabaseAdmin } from "./supabase.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "يجب تسجيل الدخول أولاً"
      });
      return;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      res.status(401).json({
        error: "رمز الدخول غير صالح"
      });
      return;
    }

    const { data, error } =
      await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: "انتهت جلسة الدخول، سجل دخولك مرة أخرى"
      });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    res.status(500).json({
      error: "تعذر التحقق من الحساب"
    });
  }
}
