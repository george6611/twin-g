"use client";

import { useState } from "react";
import { Bike, X } from "lucide-react";
import { validateInputField, validateInputFields } from "../../lib/validators/inputValidator";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

const REQUIRED_FIELDS = ["fullName", "whatsappPhone", "stage", "sacco"];

const INITIAL_VALUES = {
  fullName: "",
  whatsappPhone: "",
  email: "",
  stage: "",
  sacco: "",
};

export function BecomeRiderButton({ className = "", showIcon = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const closeModal = () => {
    setIsOpen(false);
    setIsSubmitted(false);
    setValues(INITIAL_VALUES);
    setErrors({});
    setSubmitError("");
    setIsSubmitting(false);
  };

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateInputField(field, value) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validation = validateInputFields(values, [...REQUIRED_FIELDS, "email"]);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitError("");
    setIsSubmitting(true);

    fetch(`${BACKEND_URL}/api/rider/onboarding/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName: values.fullName,
        whatsappPhone: values.whatsappPhone,
        email: values.email,
        stage: values.stage,
        sacco: values.sacco,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || "Failed to submit rider application");
        }
        setIsSubmitted(true);
      })
      .catch((error) => {
        setSubmitError(error.message || "Failed to submit rider application");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {showIcon ? <Bike className="mr-2" /> : null}
        Become a Rider
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" aria-label="Close become rider modal" onClick={closeModal} className="absolute inset-0 bg-black/45" />

          <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white border border-orange-100 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-orange-100">
              <h3 className="text-lg md:text-xl font-bold text-orange-700">Become a Rider</h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="px-5 py-8 text-center space-y-3">
                <p className="text-xl font-semibold text-orange-700">Application received</p>
                <p className="text-sm text-slate-600">Thank you. The Twin-G team will contact you soon.</p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-semibold transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
                <div>
                  <label htmlFor="rider-full-name" className="block text-sm font-semibold text-slate-700 mb-1">
                    Full name
                  </label>
                  <input
                    id="rider-full-name"
                    type="text"
                    value={values.fullName}
                    onChange={(event) => handleChange("fullName", event.target.value)}
                    className="w-full border border-orange-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="John Doe"
                  />
                  {errors.fullName ? <p className="text-xs text-red-600 mt-1">{errors.fullName}</p> : null}
                </div>

                <div>
                  <label htmlFor="rider-whatsapp" className="block text-sm font-semibold text-slate-700 mb-1">
                    WhatsApp phone number
                  </label>
                  <input
                    id="rider-whatsapp"
                    type="tel"
                    value={values.whatsappPhone}
                    onChange={(event) => handleChange("whatsappPhone", event.target.value)}
                    className="w-full border border-orange-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="+254700000000"
                  />
                  {errors.whatsappPhone ? <p className="text-xs text-red-600 mt-1">{errors.whatsappPhone}</p> : null}
                </div>

                <div>
                  <label htmlFor="rider-email" className="block text-sm font-semibold text-slate-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    id="rider-email"
                    type="email"
                    value={values.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="w-full border border-orange-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="name@email.com"
                  />
                  {errors.email ? <p className="text-xs text-red-600 mt-1">{errors.email}</p> : null}
                </div>

                <div>
                  <label htmlFor="rider-stage" className="block text-sm font-semibold text-slate-700 mb-1">
                    Stage
                  </label>
                  <input
                    id="rider-stage"
                    type="text"
                    value={values.stage}
                    onChange={(event) => handleChange("stage", event.target.value)}
                    className="w-full border border-orange-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Town stage"
                  />
                  {errors.stage ? <p className="text-xs text-red-600 mt-1">{errors.stage}</p> : null}
                </div>

                <div>
                  <label htmlFor="rider-sacco" className="block text-sm font-semibold text-slate-700 mb-1">
                    Sacco
                  </label>
                  <input
                    id="rider-sacco"
                    type="text"
                    value={values.sacco}
                    onChange={(event) => handleChange("sacco", event.target.value)}
                    className="w-full border border-orange-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                    placeholder="Your sacco"
                  />
                  {errors.sacco ? <p className="text-xs text-red-600 mt-1">{errors.sacco}</p> : null}
                </div>

                {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-3 rounded-xl font-semibold transition"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
