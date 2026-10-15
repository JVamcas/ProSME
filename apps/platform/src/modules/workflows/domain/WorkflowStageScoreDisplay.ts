export function formatWorkflowStageScore(score: {
  averageScore: number | null;
  scoreMaximum: number | null;
  scoreUnit: "POINTS" | "PERCENTAGE" | null;
}): string {
  if (score.averageScore === null || score.scoreMaximum === null) return "—";
  const value = score.averageScore.toFixed(2);
  if (score.scoreUnit === "PERCENTAGE") {
    return score.scoreMaximum === 100
      ? `${value}%`
      : `${value}% / ${score.scoreMaximum}%`;
  }
  return `${value} / ${score.scoreMaximum}`;
}
