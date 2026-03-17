import Link from "next/link";
import { Navbar } from "./components/shared/Navbar";
import Footer from "./components/shared/Footer";
import { getServerUser } from "./lib/getServerUser";
import { redirect } from "next/navigation";

export default async function NotFound() {
  const user = await getServerUser();
  if (!user) {
    // unauthenticated users get pushed to login instead of seeing 404
    redirect('/login');
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-6xl font-bold text-orange-600 mb-4">404</h1>
          <p className="text-2xl text-gray-700 mb-6">Oops! Page not found.</p>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg shadow hover:bg-orange-700 transition"
          >
            Go back home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
