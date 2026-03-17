"use client";

import ProtectedRoute from "../../components/ProtectedRoute";

export default function RiderLayout({ children }) {
  return (
    <ProtectedRoute requiredRoles={["rider"]} fallbackUrl="/">
      {children}
    </ProtectedRoute>
  );
}
