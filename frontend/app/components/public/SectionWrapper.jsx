// =============================
// components/public/SectionWrapper.jsx
// =============================
export function SectionWrapper({ children, className = "" }) {
  return (
    <section className={`py-20 ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </section>
  );
}
