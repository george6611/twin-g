"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Navbar as PublicNavbar } from "../public/Navabr";

export { PublicNavbar as Navbar };

export default function MobileNavbar({ user, links }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="md:hidden p-2 rounded-lg border border-orange-200 text-orange-700" onClick={() => setOpen(!open)}>
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="md:hidden bg-white shadow-md px-4 py-4 space-y-2">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-orange-50 hover:text-orange-700">
              {link.label}
            </Link>
          ))}

          {user ? (
            <form method="POST" action="/api/auth/logout">
              <button className="block bg-orange-600 text-white text-center py-2.5 rounded-xl mt-2">
                Logout
              </button>
            </form>
          ) : (
            <a href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk" target="_blank" rel="noopener noreferrer" className="block bg-orange-600 text-white text-center py-2.5 rounded-xl mt-2">
              Download App
            </a>
          )}
        </div>
      )}
    </>
  );
}