"use client";

import ProtectedRoute from "../../components/ProtectedRoute";

export default function AdminLayout({ children }) {
  return (
    <ProtectedRoute requiredRoles={["admin", "super_admin", "superadmin"]} fallbackUrl="/">
      {children}
    </ProtectedRoute>
  );
}
