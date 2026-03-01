export default function JourneyCard({ student }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Academic Journey
      </h2>

      <div className="flex justify-between text-gray-600 font-medium mb-4">
        <span>Start</span>
        <span>Research</span>
        <span>Practice</span>
        <span>Revise</span>
        <span className="text-blue-600 font-bold">Success</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-6">
        <div
          className="bg-green-500 h-6 rounded-full text-center text-white text-sm flex items-center justify-center"
          style={{ width: `${student.progress}%` }}
        >
          {student.progress}% Complete
        </div>
      </div>
    </div>
  );
}