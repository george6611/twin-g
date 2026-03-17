"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "",
    region: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Validation
    if (!formData.businessName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setError("Business name, email, phone, and password are required");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        username: formData.email, // Use email as username
        email: formData.email,
        password: formData.password,
        shopName: formData.businessName,
        shopDescription: formData.businessDescription,
        contact: formData.phone,
        addresses: [
          {
            isPrimary: true,
            label: "Main Shop",
            street: "",
            city: formData.city || "Nairobi",
            region: formData.region || "Kenya",
            postalCode: "",
            country: "Kenya",
            description: "Primary business location",
            latitude: null,
            longitude: null,
          },
        ],
      };

      console.log("Registering vendor with payload:", payload);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await response.json();

      console.log("Response status:", response.status);
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      setSuccess("✅ Registration successful! Redirecting to login...");
      console.log("Registration successful:", data);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-white font-sans">
      {/* Optional Navbar */}
      {/* <Navbar /> */}

      <div className="flex flex-1">
        {/* Left: Hero Illustration */}
        <div className="hidden lg:flex flex-1 bg-orange-100 relative overflow-hidden items-center justify-center">
          <img
            src="/vendor-illustration.png" // Replace with vendor-related illustration
            alt="Vendor Registration Illustration"
            className="max-w-md animate-fadeIn"
          />
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-orange-400/20 via-transparent to-orange-400/20"></div>
        </div>

        {/* Right: Registration Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <h2 className="text-4xl font-extrabold text-orange-600 text-center">
              Vendor Registration
            </h2>
            <p className="text-center text-gray-600">
              Create your vendor account to start offering your services on Twin-G.
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              {/* Business Name */}
              <input
                type="text"
                name="businessName"
                placeholder="Business Name *"
                value={formData.businessName}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Business Description */}
              <textarea
                name="businessDescription"
                placeholder="Business Description (optional)"
                value={formData.businessDescription}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Email */}
              <input
                type="email"
                name="email"
                placeholder="Email Address *"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Phone */}
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number *"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* City */}
              <input
                type="text"
                name="city"
                placeholder="City (optional, default: Nairobi)"
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Region */}
              <input
                type="text"
                name="region"
                placeholder="Region (optional, default: Kenya)"
                value={formData.region}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Password */}
              <input
                type="password"
                name="password"
                placeholder="Password *"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Confirm Password */}
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password *"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-6 border border-transparent text-lg font-bold rounded-xl text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-orange-600 font-medium hover:text-orange-700"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}