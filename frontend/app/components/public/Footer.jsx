// =============================
// components/public/Footer.jsx
// =============================
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-orange-700 text-gray-100 py-6 md:py-8 mt-10 md:mt-14">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 md:px-6 grid grid-cols-3 gap-2 sm:gap-4 md:gap-8">
        <div>
          <h4 className="text-xs sm:text-base md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">Twin-G</h4>
          <p className="text-[10px] sm:text-sm md:text-base leading-tight">Fast, reliable and local delivery service you can trust.</p>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs sm:text-sm md:text-base mb-1 md:mb-2 leading-tight">Quick Links</h4>
          <ul className="space-y-1 text-[10px] sm:text-sm md:text-base leading-tight">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/login">Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold text-xs sm:text-sm md:text-base mb-1 md:mb-2 leading-tight">Contact</h4>
          <div className="space-y-1 text-[10px] sm:text-sm md:text-base leading-tight">
            <p>Phone: +254 700 000000</p>
            <p>Email: info@twing.co.ke</p>
            <p>Location: Nyahururu, Kenya</p>
          </div>
        </div>
      </div>

      <div className="text-center mt-6 text-xs md:text-sm text-white/80">
        © 2026 Twin-G. All rights reserved.
      </div>
    </footer>
  );
}
