import { getServerUser } from "../lib/getServerUser";
import AdminNavbar from "../components/shared/AdminNavbar";
import VendorNavbar from "../components/shared/VendorNavbar";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import Footer from "../components/shared/Footer";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }) {
  const user = await getServerUser();

  if (!user) {
    // Immediately redirect unauthenticated users to the login page
    redirect('/login');
  }

  console.log(user)
  const Navbar = user.role === "admin" || user.role === "superadmin" ? AdminNavbar : VendorNavbar;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <DashboardHeader user={user} />
      <main className="flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
}