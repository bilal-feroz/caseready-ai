export interface CandidateInput {
  caseId: string;
  caseNumber: string;
  patientName: string;
  procedureName: string;
  durationMinutes: number;
  readinessScore: number;
  standbyConsent: boolean;
  availabilityStatus: string; // confirmed, pending, unavailable
  teamCompatible: boolean;
  equipmentAvailable: boolean;
  bedAvailable: boolean;
  hasHardBlockers: boolean;
}

export interface CandidateResult {
  caseId: string;
  eligible: boolean;
  durationScore: number;
  teamScore: number;
  equipmentScore: number;
  readinessScore: number;
  availabilityScore: number;
  overallScore: number;
  failedConstraints: string[];
  rankingReason: string;
}

export function evaluateSlotCandidates(
  slotDuration: number,
  candidates: CandidateInput[]
): CandidateResult[] {
  return candidates.map(c => {
    const failedConstraints: string[] = [];

    // 1. Standby Consent
    if (!c.standbyConsent) {
      failedConstraints.push("No standby consent");
    }

    // 2. Duration Fit
    if (c.durationMinutes > slotDuration) {
      failedConstraints.push(`Duration exceeds slot (${c.durationMinutes}m > ${slotDuration}m)`);
    }

    // 3. Team Compatibility
    if (!c.teamCompatible) {
      failedConstraints.push("Team incompatible");
    }

    // 4. Equipment Availability
    if (!c.equipmentAvailable) {
      failedConstraints.push("Equipment unavailable");
    }

    // 5. Patient Availability
    if (c.availabilityStatus === "unavailable") {
      failedConstraints.push("Patient unavailable");
    }

    // 6. Bed Availability (Postoperative Capacity)
    if (!c.bedAvailable) {
      failedConstraints.push("Postoperative bed unavailable");
    }

    // 7. Hard Blockers
    if (c.hasHardBlockers) {
      failedConstraints.push("Unresolved hard blockers");
    }

    const eligible = failedConstraints.length === 0;

    // Scores
    const readinessScoreVal = c.readinessScore;
    const teamScoreVal = c.teamCompatible ? 100 : 0;
    const equipmentScoreVal = c.equipmentAvailable ? 100 : 0;

    // Availability score: confirmed = 100, pending = 50, unavailable = 0
    let availabilityScoreVal = 0;
    if (c.availabilityStatus === "confirmed") availabilityScoreVal = 100;
    else if (c.availabilityStatus === "pending") availabilityScoreVal = 50;

    // Duration score: 100 if perfect fit, subtract difference
    const diff = Math.abs(slotDuration - c.durationMinutes);
    const durationScoreVal = Math.max(0, Math.round((1 - diff / slotDuration) * 100));

    // Weighted Overall Score
    // Readiness: 30%, Duration: 25%, Team: 15%, Equipment: 15%, Availability: 15%
    const overallScore = eligible
      ? Math.round(
          readinessScoreVal * 0.3 +
            durationScoreVal * 0.25 +
            teamScoreVal * 0.15 +
            equipmentScoreVal * 0.15 +
            availabilityScoreVal * 0.15
        )
      : 0;

    // Reason
    let rankingReason = "";
    if (eligible) {
      if (overallScore >= 90) {
        rankingReason = `Fits available slot perfectly (${c.durationMinutes} min est.), same room setup, clinically cleared, and patient ready.`;
      } else {
        rankingReason = `Good fit (${c.durationMinutes} min est.), but slightly lower readiness or duration fit.`;
      }
    } else {
      rankingReason = `Excluded: ${failedConstraints.join(", ")}`;
    }

    return {
      caseId: c.caseId,
      eligible,
      durationScore: durationScoreVal,
      teamScore: teamScoreVal,
      equipmentScore: equipmentScoreVal,
      readinessScore: readinessScoreVal,
      availabilityScore: availabilityScoreVal,
      overallScore,
      failedConstraints,
      rankingReason,
    };
  });
}
