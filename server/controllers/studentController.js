exports.getStudent = (req, res) => {
  const { id } = req.params;

  // Temporary mock data
  const mockStudent = {
    id,
    name: "Test Student",
    year: 2,
    creditsCompleted: 120,
    creditsRequired: 360,
    average: 58,
    riskLevel: "Medium"
  };

  res.json(mockStudent);
};