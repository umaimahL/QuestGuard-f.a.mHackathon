export default function RiskCard({ student }) {
  const isHigh = student.risk === "High";

  return (
    <div className={`rounded-2xl shadow-lg p-6 ${
      isHigh ? "bg-red-100 border border-red-300" : "bg-green-100"
    }`}>
      <h2 className={`text-lg font-bold ${
        isHigh ? "text-red-600" : "text-green-600"
      }`}>
        {student.risk} Risk: Deadline Approaching
      </h2>

      <p className="mt-2 text-gray-700">
        Recommended Quest: Study Firewalls (30 min)
      </p>

      <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl shadow hover:bg-blue-700 transition">
        Start Quest +150 XP
      </button>
    </div>
  );
}