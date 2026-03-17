// =============================
// components/public/Navbar.jsx
// =============================
"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const linkClass = (href) =>
    `${
      isActive(href)
        ? "text-orange-600 font-bold border-b-2 border-orange-600 pb-1"
        : "text-gray-700 hover:text-orange-600 transition"
    }`;

  const mobileLinkClass = (href) =>
    `block px-3 py-2 rounded-lg transition ${
      isActive(href)
        ? "bg-orange-50 text-orange-700 font-semibold"
        : "text-gray-700 hover:bg-orange-50 hover:text-orange-700"
    }`;

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-3">
        <Link href="/" className="text-xl sm:text-2xl font-bold text-orange-600 truncate">
          Twin-G
        </Link>

        <nav className="hidden md:flex space-x-8 items-center">
          <Link href="/" className={linkClass("/")}>
            Home
          </Link>
          <Link href="/about" className={linkClass("/about")}>
            About
          </Link>
          <Link href="/careers" className={linkClass("/careers")}>
            Careers
          </Link>
          <Link href="/contact" className={linkClass("/contact")}>
            Contact
          </Link>
          <Link href="/login" className={linkClass("/login")}>
            Login
          </Link>
          <a
            href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange-600 text-white px-5 py-2 rounded-2xl shadow-lg hover:bg-orange-700 transition"
          >
            Download App
          </a>
        </nav>

        <button
          className="md:hidden p-2 rounded-lg border border-orange-200 text-orange-700"
          onClick={() => setOpen(!open)}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white shadow-md px-4 py-4 space-y-2">
          <Link href="/" className={mobileLinkClass("/")}>
            Home
          </Link>
          <Link href="/about" className={mobileLinkClass("/about")}>
            About
          </Link>
          <Link href="/careers" className={mobileLinkClass("/careers")}>
            Careers
          </Link>
          <Link href="/contact" className={mobileLinkClass("/contact")}>
            Contact
          </Link>
          <Link href="/login" className={mobileLinkClass("/login")}>
            Login
          </Link>
          <a
            href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-orange-600 text-white text-center py-2.5 rounded-xl mt-2"
          >
            Download App
          </a>
        </div>
      )}
    </header>
  );
}
