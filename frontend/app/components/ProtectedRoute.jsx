"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useAuth from "../hooks/useAuth";

/**
 * Protected Route Wrapper
 * Redirects unauthorized users based on role
 * 
 * Usage:
 * <ProtectedRoute requiredRoles={["vendor", "vendor_staff"]}>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children, requiredRoles = [], fallbackUrl = "/" }) {
  const router = useRouter();
  const { user, authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load

    // Not authenticated
    if (!isAuthenticated) {
      console.log("[ProtectedRoute] User not authenticated, redirecting to login");
      router.push("/auth/login");
      return;
    }

    // No roles required (just needs to be logged in)
    if (requiredRoles.length === 0) {
      return;
    }

    // Check if user has required role
    if (!requiredRoles.includes(user?.role)) {
      console.log(`[ProtectedRoute] User role ${user?.role} not in allowed roles:`, requiredRoles);
      router.push(fallbackUrl);
      return;
    }

    console.log(`[ProtectedRoute] User role ${user?.role} authorized`);
  }, [authLoading, isAuthenticated, user?.role, requiredRoles, router, fallbackUrl]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (requiredRoles.length > 0 && !requiredRoles.includes(user?.role))) {
    return null;
  }

  return children;
}
