import { Navbar } from "../../components/shared/Navbar";
import Footer  from "../../components/shared/Footer";
import { SectionWrapper } from "../../components/shared/SectionWrapper";
import { ValueCard } from "../../components/public/ValueCard";
import { StatCard } from "../../components/public/StatCard";

export default function CareersPage() {
  return (
    <div className="bg-white text-gray-800">
      <Navbar />

      {/* Hero */}
      <SectionWrapper className="pt-32 pb-20 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          Careers at Twin-G
        </h1>
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-gray-600 break-words">
          Join a fast-growing local delivery platform and build your future with us.
          Whether you're a rider or part of operations, Twin-G is growing.
        </p>
      </SectionWrapper>

      {/* Why Work With Us */}
      <SectionWrapper className="bg-orange-50">
        <h2 className="text-3xl font-bold text-center mb-12">
          Why Join Twin-G?
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
          <ValueCard
            title="Flexible Work"
            description="Choose your schedule and earn based on your availability."
          />
          <ValueCard
            title="Growth Opportunity"
            description="Be part of a startup with strong expansion potential."
          />
          <ValueCard
            title="Community Impact"
            description="Support local businesses and serve your community."
          />
        </div>
      </SectionWrapper>

      {/* Rider Stats */}
      <SectionWrapper>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
          Rider Opportunities
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard number="Flexible" label="Work Hours" />
          <StatCard number="Weekly" label="Payouts" />
          <StatCard number="Growing" label="Customer Base" />
          <StatCard number="Local" label="Service Areas" />
        </div>
      </SectionWrapper>

      {/* Apply CTA */}
      <SectionWrapper className="bg-orange-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-6">
          Ready to Start Earning?
        </h2>
        <p className="mb-8 text-white/90 break-words">
          Become a Twin-G rider today and start delivering with confidence.
        </p>

        <a
          href="/apply"
          className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-semibold transition"
        >
          Apply as a Rider
        </a>
      </SectionWrapper>

      <Footer />
    </div>
  );
}