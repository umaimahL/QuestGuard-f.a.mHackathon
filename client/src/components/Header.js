export default function Header({ student }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-between items-center">
      
      <div>
        <h1 className="text-3xl font-bold text-blue-700">
          Pathfinder
        </h1>
        <p className="text-gray-500">Academic GPS</p>
      </div>

      <div className="text-right">
        <p className="text-lg font-semibold">
          Level {student.level} | {student.title}
        </p>
        <p className="text-sm text-gray-500">
          XP: {student.xp}
        </p>
        <div className="w-48 bg-gray-200 rounded-full h-3 mt-2">
          <div
            className="bg-blue-500 h-3 rounded-full"
            style={{ width: `${student.progress}%` }}
          ></div>
        </div>
      </div>

    </div>
  );
}