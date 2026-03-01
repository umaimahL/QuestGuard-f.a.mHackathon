import { useState } from "react";
import Header from "./components/Header";
import JourneyCard from "./components/JourneyCard";
import RiskCard from "./components/RiskCard";
import QuestForm from "./components/QuestForm";
import QuestList from "./components/QuestList";

function App() {
  const [student, setStudent] = useState({
    name: "Alex",
    level: 3,
    title: "Network Explorer",
    progress: 40,
    xp: 450,
    risk: "High"
  });

  const [quests, setQuests] = useState([
    {
      id: 1,
      title: "Complete Network Basics",
      difficulty: "Hard",
      xp: 300,
      completed: false
    },
    {
      id: 2,
      title: "Database Assignment",
      difficulty: "Easy",
      xp: 100,
      completed: true
    },
    {
      id: 3,
      title: "Cybersecurity Challenge",
      difficulty: "Medium",
      xp: 200,
      completed: false
    }
  ]);

  const completeQuest = (id) => {
    // find the quest before updating state
    const quest = quests.find((q) => q.id === id);

    if (quest && !quest.completed) {
      // update student stats
      setStudent((prev) => ({
        ...prev,
        xp: prev.xp + quest.xp,
        progress: Math.min(prev.progress + 5, 100)
      }));

      // update quests list
      const updatedQuests = quests.map((q) =>
        q.id === id ? { ...q, completed: true } : q
      );
      setQuests(updatedQuests);
    }
  };

  const addQuest = (newQuest) => {
    setQuests((prev) => [...prev, newQuest]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 to-blue-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Header student={student} />
        <JourneyCard student={student} />
        <RiskCard student={student} />
        <QuestForm addQuest={addQuest} />
        <QuestList quests={quests} completeQuest={completeQuest} />
      </div>
    </div>
  );
}

export default App;