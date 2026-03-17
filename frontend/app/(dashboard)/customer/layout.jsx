"use client";

import ProtectedRoute from "../../components/ProtectedRoute";

export default function CustomerLayout({ children }) {
  return (
    <ProtectedRoute requiredRoles={["customer"]} fallbackUrl="/">
      {children}
    </ProtectedRoute>
  );
}
