import { Navbar } from "../../components/shared/Navbar";
import  Footer  from "../../components/shared/Footer";
import { SectionWrapper } from "../../components/public/SectionWrapper";
import { StatCard } from "../../components/public/StatCard";

export default function ContactPage() {
  return (
    <div className="bg-white text-gray-800">
      <Navbar />

      {/* Hero */}
      <SectionWrapper className="pt-32 pb-20 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          Contact Twin-G
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 break-words">
          Have questions, feedback, or partnership inquiries? 
          We'd love to hear from you.
        </p>
      </SectionWrapper>

      {/* Contact Info + Form */}
      <SectionWrapper className="bg-orange-50">
        <div className="grid md:grid-cols-2 gap-12">
          
          {/* Contact Information */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">Get in Touch</h2>

            <div className="space-y-4 text-gray-700 break-words">
              <p><strong>Phone:</strong> +254 7XX XXX XXX</p>
              <p><strong>Email:</strong> support@twing.co.ke</p>
              <p><strong>Location:</strong> Nyahururu, Kenya</p>
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <StatCard number="24/7" label="Customer Support" />
              <StatCard number="Fast" label="Response Time" />
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">Send Us a Message</h2>

            <form className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                className="w-full border border-orange-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />

              <input
                type="email"
                placeholder="Your Email"
                className="w-full border border-orange-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-600"
              />

              <textarea
                rows="4"
                placeholder="Your Message"
                className="w-full border border-orange-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-600"
              ></textarea>

              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition w-full"
              >
                Send Message
              </button>
            </form>
          </div>

        </div>
      </SectionWrapper>

      <Footer />
    </div>
  );
}