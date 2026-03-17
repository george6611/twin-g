// =============================
// components/shared/SectionWrapper.jsx
// =============================
export function SectionWrapper({ children, className = "", dashboard = false }) {
  return (
    <section className={`${dashboard ? "py-6" : "py-20"} ${className}`}>
      <div className="max-w-7xl mx-auto px-6">
        {children}
      </div>
    </section>
  );
}