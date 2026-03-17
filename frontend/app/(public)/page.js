// =====================================================
// app/(public)/page.jsx
// Updated to use reusable components from:
// app/components/public/
// =====================================================

"use client";

import React from "react";
import {
  Download,
  Smartphone,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  ChevronRight,
} from "lucide-react";

// ✅ Import reusable components
import { Navbar } from "../components/public/Navabr";
import Footer  from "../components/shared/Footer";
import { SectionWrapper } from "../components/public/SectionWrapper";
import { ValueCard } from "../components/public/ValueCard";
import { StatCard } from "../components/public/StatCard";
import { BecomeRiderButton } from "../components/public/BecomeRiderButton";

const TwinGLanding = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* ================= NAVBAR ================= */}
      <Navbar />

      {/* ================= HERO SECTION ================= */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Fast & Reliable <span className="text-orange-600">Delivery</span> in Your Area
            </h1>
            <p className="text-xl text-slate-600 max-w-lg break-words">
              Order anything. Get it delivered quickly and safely with Twin-G. Your local logistics partner.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:scale-105 transition flex items-center justify-center">
                <Download className="mr-2" /> Download Twin-G App
              </a>
              <BecomeRiderButton
                showIcon
                className="border-2 border-slate-200 px-8 py-4 rounded-xl text-lg font-bold hover:bg-slate-50 transition flex items-center justify-center"
              />
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-64 h-[500px] bg-slate-800 rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-orange-100 flex items-center justify-center">
                <p className="text-slate-400 text-sm">App UI Mockup</p>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl hidden lg:block">
              <div className="flex items-center space-x-2">
                <div className="bg-green-100 p-2 rounded-full">
                  <Clock className="text-green-600 w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Delivery Time</p>
                  <p className="font-bold">15-20 Mins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= QR SECTION ================= */}
      <SectionWrapper className="bg-white border-y border-orange-100 text-center">
        <h2 className="text-2xl font-bold mb-6">Scan to Download Twin-G</h2>
        <div className="bg-orange-50 w-48 h-48 mx-auto rounded-2xl flex items-center justify-center border-2 border-dashed border-orange-200">
          <p className="text-orange-400 text-xs text-center p-4">[QR CODE IMAGE HERE]</p>
        </div>
        <div className="mt-6 space-y-3">
          <a href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium inline-flex items-center">
            <Smartphone className="mr-2 w-5 h-5" /> Download APK for Android
          </a>
          <p className="text-sm text-orange-600 italic">
            Available for Android devices • Coming soon to Play Store
            Available for Android devices • Coming soon to Play Store
          </p>
        </div>
      </SectionWrapper>

      {/* ================= WHY CHOOSE US ================= */}
      <SectionWrapper>
          <ValueCard
            icon={<Clock className="text-orange-600" />}
            title="Fast Delivery"
            description="Get your items delivered within minutes."
          />
          <ValueCard
            icon={<MapPin className="text-orange-600" />}
            title="Real-Time Tracking"
            description="Track your order from pickup to delivery."
          />
          <ValueCard
            icon={<ShieldCheck className="text-orange-600" />}
            title="Affordable Pricing"
            description="Transparent and fair pricing for everyone."
          />
          <ValueCard
            icon={<Star className="text-orange-600" />}
            title="Local Support"
            description="Order from shops right in your neighborhood."
          />
      </SectionWrapper>

      {/* ================= HOW IT WORKS ================= */}
      <SectionWrapper className="bg-orange-50 text-center">
        <h2 className="text-4xl font-extrabold mb-16">How Twin-G Works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          {["Download the App", "Place Your Order", "Get It Delivered Fast"].map(
            (step, i) => (
              <div key={i}>
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold mb-3">{step}</h3>
              </div>
            )
          )}
        </div>
      </SectionWrapper>

      {/* ================= TRUST SECTION ================= */}
      <SectionWrapper className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-extrabold mb-4">Why Choose Twin-G?</h2>
          <p className="text-white/90 max-w-2xl mx-auto text-lg break-words">
            Join thousands of satisfied customers and riders who trust Twin-G for fast, reliable delivery.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <StatCard number="1,000+" label="Deliveries Done" inverted />
          <StatCard number="100+" label="Happy Customers" inverted />
          <StatCard number="Nyahururu" label="Primary Coverage Area" inverted />
        </div>
      </SectionWrapper>

      {/* ================= FINAL CTA ================= */}
      <SectionWrapper className="text-center">
        <div className="max-w-3xl mx-auto space-y-8 bg-orange-50 p-12 rounded-[2rem]">
          <h2 className="text-4xl font-extrabold leading-tight">
            Ready to Experience <br /> Fast Delivery?
          </h2>
          <a href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk" target="_blank" rel="noopener noreferrer" className="bg-orange-600 text-white px-12 py-5 rounded-2xl text-xl font-black hover:bg-orange-700 shadow-2xl transition-all hover:scale-105 inline-flex items-center">
            Download Twin-G Now <ChevronRight className="ml-2" />
          </a>
        </div>
      </SectionWrapper>

      {/* ================= FOOTER ================= */}
      <Footer />
    </div>
  );
};

export default TwinGLanding;
