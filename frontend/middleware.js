import { NextResponse } from "next/server";

async function verifyAuth(req) {
  try {
    // Call local API route which proxies to backend
    const url = new URL('/api/auth/me', req.url);
    
    const cookieHeader = req.headers.get('cookie') || '';
    console.log('🍪 [Middleware] Cookies being sent:', cookieHeader ? 'YES' : 'NO', cookieHeader.substring(0, 100));
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    });
    
    console.log('📡 [Middleware] /api/auth/me response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unable to read error');
      console.log('❌ [Middleware] Auth verification failed:', errorText);
      return null;
    }
    
    const data = await res.json();
    console.log('✅ [Middleware] Auth data received:', JSON.stringify(data));
    return data.user?.role || null;
  } catch (error) {
    console.log('❌ [Middleware] Auth verification error:', error.message);
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const hasSessionCookie =
    !!req.cookies.get("accessToken") ||
    !!req.cookies.get("refreshToken") ||
    !!req.cookies.get("authToken") ||
    !!req.cookies.get("token") ||
    !!req.cookies.get("session_token");
  
  console.log('🔐 [Middleware] Checking path:', pathname);

  // Check if route requires authentication
  const requiresAuth = pathname.startsWith("/admin") || 
                       pathname.startsWith("/dashboard") || 
                       pathname === "/vendor" ||
                       pathname.startsWith("/vendor");

  if (!requiresAuth) {
    return NextResponse.next();
  }

  // Verify authentication with backend
  const role = await verifyAuth(req);
  
  console.log('👤 [Middleware] Role from backend:', role);

  if (!role) {
    if (hasSessionCookie) {
      console.log('⚠️ [Middleware] Auth verify failed but session cookie exists, allowing request');
      return NextResponse.next();
    }
    console.log('❌ [Middleware] No role, redirecting to login');
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Handle /vendor route
  if (pathname === "/vendor" || pathname.startsWith("/vendor")) {
    if (role === "vendor" || role === "vendor_staff") {
      console.log('✅ [Middleware] Vendor access granted');
      return NextResponse.next();
    }
    if (role === "admin" || role === "super_admin" || role === "superadmin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Handle /admin route  
  if (pathname.startsWith("/admin")) {
    if (["admin", "super_admin", "superadmin"].includes(role)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Handle other dashboard routes
  if (pathname.startsWith("/dashboard/rider") && role !== "rider") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/dashboard/customer") && role !== "customer") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/vendor/:path*", "/vendor"],
};
