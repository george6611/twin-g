"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../../hooks/useAuth"; // adjust path

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth(); // useAuth provides login + current user

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Login via useAuth hook (handles cookie automatically)
      const logged = await login({ identifier: email, password });

      
      // Wait a bit for cookies to be fully set
      await new Promise(resolve => setTimeout(resolve, 500));
      
    
      // use returned user for redirect (avoids stale state)
      const role = logged?.user?.role || logged?.role || user?.role;
      

      // Redirect based on role; use full reload to ensure cookie is sent
      if (role === "vendor" || role === "vendor_staff") {
        window.location.href = "/vendor";
      } else if (role === "admin" || role === "superadmin" || role === "super_admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-white font-sans">
      <div className="flex flex-1">
        {/* Left: Hero / Image */}
        <div className="hidden lg:flex flex-1 bg-orange-100 relative overflow-hidden items-center justify-center">
          <img
            src="/auth-illustration.jpg"
            alt="Delivery Illustration"
            className="max-w-md animate-fadeIn"
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-400/20 via-transparent to-orange-400/20"></div>
        </div>

        {/* Right: Login Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <h2 className="text-4xl font-extrabold text-orange-600 text-center">
              Welcome Back
            </h2>
            <p className="text-center text-gray-600">
              Log in to access your Twin-G account and manage deliveries.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-gray-900"
                    placeholder="Password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <a href="/auth/forgot-password" className="font-medium text-orange-600 hover:text-orange-700">
                    Forgot your password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-6 border border-transparent text-lg font-bold rounded-xl text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? "Logging in..." : "Sign In"}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              Don’t have an account?{" "}
              <a href="/register" className="text-orange-600 font-medium hover:text-orange-700">
                Register Now
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}