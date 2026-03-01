export default function QuestList({ quests, completeQuest }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Active Quests
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className="border rounded-xl p-4 shadow-sm bg-gray-50"
          >
            <h3 className="font-bold text-lg">
              {quest.title}
            </h3>

            <p className="text-sm text-gray-600">
              Difficulty: {quest.difficulty}
            </p>

            <p className="text-sm text-gray-600">
              Reward: {quest.xp} XP
            </p>

            {quest.completed ? (
              <p className="mt-2 text-green-600 font-semibold">
                ✔ Completed
              </p>
            ) : (
              <button
                onClick={() => completeQuest(quest.id)}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Complete Quest
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}