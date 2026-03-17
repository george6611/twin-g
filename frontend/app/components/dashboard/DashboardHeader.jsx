// components/dashboard/DashboardHeader.jsx

// This component renders the header shown on dashboard pages for admin/vendor users.
// It doesn't need to be a client component unless interactive features are added later.

export default function DashboardHeader({ user }) {
  return (
    <header className="bg-gray-100 py-4 px-6 border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-800">
          {user?.role === "admin" ? "Admin Dashboard" : "Vendor Dashboard"}
        </h1>
        <p className="text-sm text-gray-600">Welcome, {user?.email || "User"}</p>
      </div>
    </header>
  );
}
