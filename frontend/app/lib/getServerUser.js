import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

function extractJwtFromCookieValue(rawValue) {
  if (!rawValue) return null;

  const value = decodeURIComponent(String(rawValue));

  if (!value.startsWith("s:")) {
    return value;
  }

  const signedPayload = value.slice(2);
  const lastDot = signedPayload.lastIndexOf(".");
  if (lastDot <= 0) return null;

  return signedPayload.slice(0, lastDot);
}

export async function getServerUser() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const rawToken =
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("session_token")?.value;
    const token = extractJwtFromCookieValue(rawToken);
    
    if (!token) return null;

    let user = null;

    try {
      if (process.env.JWT_SECRET) {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } else {
        user = jwt.decode(token);
      }
    } catch {
      user = jwt.decode(token);
    }

    if (!user) return null;

    return {
      id: user.userId || user.id,
      role: user.role,
      vendorId: user.vendorId || null,
      email: user.email || null,
    };
  } catch (err) {
    if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
      console.error("JWT verification failed:", err.message);
    }
    return null;
  }
}