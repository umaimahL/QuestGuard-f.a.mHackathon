import { useState } from "react";

export default function QuestForm({ addQuest }) {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title) return;

    const xpMap = {
      Easy: 100,
      Medium: 200,
      Hard: 300
    };

    const newQuest = {
      id: Date.now(),
      title,
      difficulty,
      xp: xpMap[difficulty],
      completed: false
    };

    addQuest(newQuest);
    setTitle("");
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Create New Quest
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Task Name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full border rounded-lg p-2"
        >
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Create Quest
        </button>
      </form>
    </div>
  );
}