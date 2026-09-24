export type QuorumRule = {
  population: "ASSIGNED_TASKS" | "REGISTERED";
  minimumCount: number | null;
  minimumPercentage: number | null;
  rounding: "CEIL";
  chairRequired: boolean;
  recusalDenominator: "EXCLUDE" | "INCLUDE";
  freeze: "AT_DECISION" | "ON_FIRST_PASS";
  abstentionsCountAsPresent: boolean;
};

export type QuorumParticipant = {
  userId: string;
  isChair: boolean;
  attendance: "PRESENT" | "ABSENT" | "RECUSED";
  coiCleared: boolean;
  abstained: boolean;
};

export function evaluateQuorum(
  rule: QuorumRule,
  participants: QuorumParticipant[],
) {
  const eligible = participants.filter(
    (participant) =>
      rule.recusalDenominator === "INCLUDE"
      || participant.attendance !== "RECUSED",
  );
  const present = eligible.filter(
    (participant) =>
      participant.attendance === "PRESENT"
      && participant.coiCleared
      && (rule.abstentionsCountAsPresent || !participant.abstained),
  );
  const requiredCount = Math.max(
    rule.minimumCount ?? 0,
    rule.minimumPercentage === null
      ? 0
      : Math.ceil(eligible.length * rule.minimumPercentage / 100),
  );
  const chairPresent = !rule.chairRequired
    || present.some((participant) => participant.isChair);
  return {
    denominator: eligible.length,
    present,
    requiredCount,
    satisfied: requiredCount > 0
      && present.length >= requiredCount
      && chairPresent,
  };
}
