// =============================
// components/public/StatCard.jsx
// =============================
export function StatCard({ number, label, inverted = false }) {
  return (
    <div
      className={`text-center p-6 sm:p-8 rounded-2xl border transition ${
        inverted
          ? "bg-white/10 backdrop-blur border-white/20 hover:bg-white/20"
          : "bg-white border-orange-100 shadow-sm hover:shadow-md"
      }`}
    >
      <h4
        className={`text-3xl sm:text-4xl font-bold mb-2 break-words ${
          inverted ? "text-white" : "text-orange-600"
        }`}
      >
        {number}
      </h4>
      <p
        className={`text-sm sm:text-base font-medium break-words ${
          inverted ? "text-white/90" : "text-gray-700"
        }`}
      >
        {label}
      </p>
    </div>
  );
}