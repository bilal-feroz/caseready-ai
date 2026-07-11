export type RequirementStatus = 
  | "completed"
  | "pending"
  | "missing"
  | "overdue"
  | "blocked"
  | "clinical_review"
  | "not_applicable";

export interface Requirement {
  id: string;
  requirementType: string;
  category: string;
  status: RequirementStatus;
  severity: "critical" | "medium" | "low";
}

export interface ReadinessResult {
  score: number;
  status: "ready" | "at_risk" | "blocked";
  hardBlockers: string[];
  warnings: string[];
  recommendedActions: string[];
}

export interface ReadinessThresholds {
  /** Score below this (with no hard blockers) is treated as at risk. */
  atRiskThreshold?: number;
  /** With hard blockers, a score below this is treated as blocked (else at risk). */
  blockedThreshold?: number;
}

export function calculateReadiness(
  requirements: Requirement[],
  thresholds: ReadinessThresholds = {}
): ReadinessResult {
  const atRiskThreshold = thresholds.atRiskThreshold ?? 90;
  const blockedThreshold = thresholds.blockedThreshold ?? 60;
  if (requirements.length === 0) {
    return {
      score: 100,
      status: "ready",
      hardBlockers: [],
      warnings: [],
      recommendedActions: [],
    };
  }

  // Define weights by requirement type
  const weights: Record<string, number> = {
    identity_confirmed: 10,
    surgical_consent: 20,
    anaesthesia_review: 30,
    pre_op_labs: 20,
    insurance_authorization: 20,
  };

  // Status values
  const statusValues: Record<RequirementStatus, number> = {
    completed: 1.0,
    not_applicable: 1.0,
    clinical_review: 0.95,
    pending: 0.5,
    missing: 0.2,
    overdue: 0.1,
    blocked: 0.0,
  };

  let totalWeight = 0;
  let weightedScoreSum = 0;

  const hardBlockers: string[] = [];
  const warnings: string[] = [];
  const recommendedActions: string[] = [];

  requirements.forEach(req => {
    const weight = weights[req.requirementType] ?? 20;
    const value = statusValues[req.status] ?? 0.5;

    totalWeight += weight;
    weightedScoreSum += weight * value;

    // Check for hard blockers
    // 1. Any status of 'blocked' or 'overdue' is a hard blocker
    // 2. Any critical requirement not completed/not_applicable is a hard blocker
    const isHardBlockerStatus = req.status === "blocked" || req.status === "overdue" || req.status === "missing";
    const isCriticalIncomplete = req.severity === "critical" && req.status !== "completed" && req.status !== "not_applicable";

    if (isHardBlockerStatus || isCriticalIncomplete) {
      hardBlockers.push(`${req.requirementType.replace(/_/g, " ")} (${req.status})`);
      recommendedActions.push(`Resolve ${req.requirementType.replace(/_/g, " ")} blocker`);
    } else if (req.status === "clinical_review") {
      warnings.push(`${req.requirementType.replace(/_/g, " ")} requires clinical review`);
      recommendedActions.push(`Perform clinical review of ${req.requirementType.replace(/_/g, " ")}`);
    } else if (req.status === "pending") {
      warnings.push(`${req.requirementType.replace(/_/g, " ")} is pending`);
      recommendedActions.push(`Follow up on pending ${req.requirementType.replace(/_/g, " ")}`);
    }
  });

  const rawScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 0;
  const score = Math.round(rawScore);

  let status: "ready" | "at_risk" | "blocked";
  if (hardBlockers.length > 0) {
    // If it has blocked status, it's blocked. If missing/pending, it can be at risk or blocked.
    // Let's check if there are actual "blocked" or "overdue" items
    const hasBlockedOrOverdue = requirements.some(r => r.status === "blocked" || r.status === "overdue");
    status = hasBlockedOrOverdue || score < blockedThreshold ? "blocked" : "at_risk";
  } else if (warnings.length > 0 || score < atRiskThreshold) {
    status = "at_risk";
  } else {
    status = "ready";
  }

  return {
    score,
    status,
    hardBlockers,
    warnings,
    recommendedActions,
  };
}
