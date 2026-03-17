// =============================
// components/public/ValueCard.jsx
// =============================
export function ValueCard({ icon, title, description }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition duration-300 h-full flex flex-col">
      <div className="text-orange-600 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 break-words">{description}</p>
    </div>
  );
}