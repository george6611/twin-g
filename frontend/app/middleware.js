import { NextResponse } from "next/server";
import { decodeJwt, jwtVerify } from "jose"; // Use jose for Middleware

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function getRoleFromToken(sessionToken) {
  if (!sessionToken) return null;

  try {
    if (process.env.JWT_SECRET) {
      const { payload } = await jwtVerify(sessionToken, SECRET);
      return payload?.role || null;
    }
  } catch (_) {
  }

  try {
    const decoded = decodeJwt(sessionToken);
    return decoded?.role || null;
  } catch (_) {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get("session_token")?.value;

  // 1. If trying to access admin/dashboard/vendor or admin without being logged in
  if ((pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) && !sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 1b. Handle short alias `/vendor` always (login state determines target)
  if (pathname === "/vendor") {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const role = await getRoleFromToken(sessionToken);

    if (!role) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

      if (role === "vendor" || role === "vendor_staff") {
        return NextResponse.next();
      }
      if (role === "admin" || role === "super_admin" || role === "superadmin") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Role-Based Protection
  if (sessionToken) {
    const userRole = await getRoleFromToken(sessionToken);

    if (!userRole) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

      // Stop non-admins from hitting /admin routes
      if (pathname.startsWith("/admin") && !["admin", "super_admin", "superadmin"].includes(userRole)) {
        console.log(`[Middleware] User role ${userRole} denied access to /admin`);
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Stop non-vendors from hitting /vendor routes
      if (pathname.startsWith("/vendor") && !["vendor", "vendor_staff"].includes(userRole)) {
        console.log(`[Middleware] User role ${userRole} denied access to /vendor`);
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Stop non-riders from hitting /dashboard/rider routes
      if (pathname.startsWith("/dashboard/rider") && userRole !== "rider") {
        console.log(`[Middleware] User role ${userRole} denied access to /dashboard/rider`);
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // Stop non-customers from hitting /dashboard/customer routes
      if (pathname.startsWith("/dashboard/customer") && userRole !== "customer") {
        console.log(`[Middleware] User role ${userRole} denied access to /dashboard/customer`);
        return NextResponse.redirect(new URL("/", req.url));
      }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/vendor"],
};