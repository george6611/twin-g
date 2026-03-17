import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// DEV mode for testing without backend
const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "true";
const DEV_ROLE = process.env.NEXT_PUBLIC_DEV_ROLE || "admin";
const DEV_USER = DEV_AUTH
  ? {
      id: "dev",
      email: "dev@local",
      role: DEV_ROLE,
      permissions: ["*"],
      vendorId: DEV_ROLE === "vendor" ? "dev" : undefined,
    }
  : null;

// Helper to read cookies
function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export default function useAuth() {
  const [user, setUser] = useState(DEV_USER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const userRef = useRef(DEV_USER);

  // Fetch current user from /api/auth/me
  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me', { credentials: "include" });
      if (!res.ok) throw new Error("Unauthenticated");

      const data = await res.json();
      
      
      const mergedUser = {
        id: data.user.id,
        role: data.user.role,
        vendorId: data.user.vendorId || undefined,
        permissions: data.user.permissions || [],
      };
      
      
      userRef.current = mergedUser;
      setUser(mergedUser);
      return mergedUser;
    } catch (err) {
      userRef.current = null;
      setUser(null);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/login', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || "Login failed");

        await fetchCurrentUser(); // cookie is automatically sent
        return json;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [fetchCurrentUser]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch('/api/auth/logout', { method: "POST", credentials: "include" });
      userRef.current = null;
      setUser(null);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const hasRole = useCallback((role) => userRef.current?.role === role, []);
  const roleHelpers = useMemo(
    () => ({
      isSuperAdmin: () => hasRole("super_admin") || hasRole("superadmin"),
      isAdmin: () => hasRole("admin") || hasRole("super_admin") || hasRole("superadmin"),
      isVendor: () => hasRole("vendor") || hasRole("vendor_staff"),
      isVendorStaff: () => hasRole("vendor_staff"),
      isCustomer: () => hasRole("customer"),
      isRider: () => hasRole("rider"),
    }),
    [hasRole]
  );

  useEffect(() => {
    if (!DEV_AUTH) fetchCurrentUser().catch(() => {});
    else setAuthLoading(false);
  }, [fetchCurrentUser]);

  return {
    user,
    userRole: user?.role,
    vendorId: user?.vendorId,
    isAuthenticated: !!user,
    loading,
    authLoading,
    error,
    login,
    logout,
    fetchCurrentUser,
    hasRole,
    ...roleHelpers,
  };
}