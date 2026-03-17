"use client";

import ProtectedRoute from "../../components/ProtectedRoute";

export default function VendorLayout({ children }) {
  return (
    <ProtectedRoute requiredRoles={["vendor", "vendor_staff"]} fallbackUrl="/">
      {children}
    </ProtectedRoute>
  );
}
