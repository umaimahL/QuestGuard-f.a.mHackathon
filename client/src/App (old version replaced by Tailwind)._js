import { useEffect, useState } from "react";

function App() {
  const [student, setStudent] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/students/1")
      .then((res) => res.json())
      .then((data) => setStudent(data))
      .catch((err) => console.error(err));
  }, []);

  if (!student) return <h2>Loading...</h2>;

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Academic GPS</h1>

      <h2>{student.name}</h2>

      <p>Year: {student.year}</p>
      <p>
        Credits: {student.creditsCompleted} / {student.creditsRequired}
      </p>
      <p>Average: {student.average}%</p>
      <p>Risk Level: {student.riskLevel}</p>
    </div>
  );
}

export default App;