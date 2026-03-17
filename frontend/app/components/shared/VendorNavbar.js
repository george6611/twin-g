"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X, Store, LogOut, PackageSearch } from "lucide-react";

export default function VendorNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navbarRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event) => {
      if (!navbarRef.current) return;
      if (!navbarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  // Reorganized by Vendor operational priority
  const links = [
    { label: "Orders", href: "/vendor/orders" },
    { label: "Inventory", href: "/vendor/inventory" },
    { label: "Analytics", href: "/vendor/analytics" },
    { label: "Transactions", href: "/vendor/transactions" },
    { label: "Staff", href: "/vendor/staff" },
    { label: "Branches", href: "/vendor/branches" },
    { label: "Customers", href: "/vendor/customers" },
    { label: "Profile", href: "/vendor/profile" },
  ];

  return (
    <header ref={navbarRef} className="bg-white shadow-sm fixed w-full z-50 top-0 left-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <Link href="/vendor" className="flex items-center gap-2 text-xl font-extrabold text-orange-600 transition-transform hover:scale-105">
            <Store className="w-6 h-6" />
            <span className="flex flex-col leading-none">
              Twin-G
              <span className="text-gray-400 font-medium text-[10px] uppercase tracking-tighter">Vendor Portal</span>
            </span>
          </Link>

          {/* Desktop Navigation (Visible on Large Screens) */}
          <nav className="hidden lg:flex space-x-1 items-center">
            {links.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-all"
              >
                {link.label}
              </Link>
            ))}
            
            <div className="h-6 w-[1px] bg-gray-200 mx-3" />

            <form method="POST" action="/api/auth/logout">
              <button className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </form>
          </nav>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
             <Link href="/vendor/orders" className="p-2 text-gray-500 hover:text-orange-600">
                <PackageSearch className="w-6 h-6" />
             </Link>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none border border-gray-100"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar/Dropdown */}
      <div className={`lg:hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
        <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-8 space-y-1 shadow-2xl">
          <div className="grid grid-cols-2 gap-2 pb-4">
             {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center py-4 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-orange-50 hover:text-orange-600 rounded-xl border border-transparent hover:border-orange-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
          
          <form method="POST" action="/api/auth/logout" className="pt-2">
            <button className="w-full flex justify-center items-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-bold active:scale-95 transition-transform">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}