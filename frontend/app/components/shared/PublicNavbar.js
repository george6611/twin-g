"use client";
import Link from "next/link";

export default function PublicNavbar() {
  return (
    <header className="bg-white shadow-md fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-orange-600">Twin-G</Link>
        <nav className="space-x-6">
          <Link href="/about">About</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/contact">Contact</Link>
          <a href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-4 py-2 rounded-lg">Download App</a>
        </nav>
      </div>
    </header>
  );
}