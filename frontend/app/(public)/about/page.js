import {Navbar} from "../../components/shared/Navbar";
import Footer from "../../components/shared/Footer";
import {SectionWrapper} from "../../components/shared/SectionWrapper";
import {ValueCard} from "../../components/public/ValueCard";
import {StatCard} from "../../components/public/StatCard";
import { BecomeRiderButton } from "../../components/public/BecomeRiderButton";

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-800">
      <Navbar />

      {/* Hero Section */}
      <SectionWrapper className="pt-32 pb-20 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          About Twin-G
        </h1>
        <p className="max-w-3xl mx-auto text-base sm:text-lg text-gray-600 break-words">
          Twin-G is a fast-growing local delivery platform focused on
          providing reliable, affordable, and real-time delivery services
          within your area. We connect customers, businesses, and riders
          through smart technology.
        </p>
      </SectionWrapper>

      {/* Mission & Vision */}
      <SectionWrapper className="bg-orange-50">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-600 break-words">
              To simplify local deliveries by providing a fast, transparent,
              and technology-driven platform that empowers customers and
              creates income opportunities for riders.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
            <p className="text-gray-600 break-words">
              To become the most trusted local delivery network, supporting
              communities and businesses while delivering excellence every day.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Core Values */}
      <SectionWrapper>
        <h2 className="text-3xl font-bold text-center mb-12">
          Our Core Values
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
          <ValueCard
            title="Speed"
            description="We prioritize quick pickups and timely deliveries without compromising quality."
          />
          <ValueCard
            title="Reliability"
            description="Customers and businesses can depend on Twin-G for consistent service."
          />
          <ValueCard
            title="Transparency"
            description="Clear pricing and real-time tracking ensure trust at every step."
          />
        </div>
      </SectionWrapper>

      {/* Stats Section */}
      <SectionWrapper className="bg-orange-700 text-white">
        <h2 className="text-3xl font-bold text-center mb-12">
          Twin-G in Numbers
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard number="1,000+" label="Deliveries Completed" inverted />
          <StatCard number="100+" label="Happy Customers" inverted />
          <StatCard number="50+" label="Active Riders" inverted />
          <StatCard number="2+" label="Service Areas" inverted />
        </div>
      </SectionWrapper>

      {/* Call To Action */}
      <SectionWrapper className="text-center">
        <h2 className="text-3xl font-bold mb-6">
          Join the Twin-G Movement
        </h2>
        <p className="text-gray-600 mb-8">
          Whether you want fast deliveries or an earning opportunity, Twin-G
          is built for you.
        </p>

        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href="https://github.com/george6611/twin-g/releases/download/v1.0.0/twin-g.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            Download App
          </a>

          <BecomeRiderButton className="border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white px-6 py-3 rounded-xl font-semibold transition" />
        </div>
      </SectionWrapper>

      <Footer />
    </div>
  );
}