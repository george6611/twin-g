"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, LayoutDashboard, LogOut } from "lucide-react";

export default function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Reorganized by operational priority
  const links = [
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Orders", href: "/admin/orders" },
    { label: "Vendors", href: "/admin/vendors" },
    { label: "Riders", href: "/admin/rider" },
    { label: "Saccos", href: "/admin/rider/saccos" },
    { label: "Customers", href: "/admin/customers" },
    { label: "Transactions", href: "/admin/transactions" },
    { label: "Notifications", href: "/admin/notifications" },
    { label: "Settings", href: "/admin/settings" },
  ];

  return (
    <header className="bg-white shadow-sm fixed w-full z-50 top-0 left-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-2 text-xl font-extrabold text-orange-600 transition-transform hover:scale-105">
            <LayoutDashboard className="w-6 h-6" />
            <span>Twin-G <span className="text-gray-400 font-light text-sm uppercase tracking-widest hidden sm:inline">Admin</span></span>
          </Link>

          {/* Desktop Navigation (Hidden on small/medium screens) */}
          <nav className="hidden xl:flex space-x-1 items-center">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
              >
                {link.label}
              </Link>
            ))}
            
            <div className="h-6 w-[1px] bg-gray-200 mx-2" />

            <form method="POST" action="/api/auth/logout">
              <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition-all">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </form>
          </nav>

          {/* Mobile/Tablet Menu Button */}
          <div className="xl:hidden flex items-center gap-4">
             <form method="POST" action="/api/auth/logout" className="hidden sm:block">
              <button className="text-sm font-semibold text-gray-500 hover:text-red-600">Logout</button>
            </form>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay Menu */}
      <div className={`xl:hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-1 shadow-xl">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-4 px-4">
            <form method="POST" action="/api/auth/logout">
              <button className="w-full flex justify-center items-center gap-2 bg-orange-600 text-white py-3 rounded-xl font-bold">
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}