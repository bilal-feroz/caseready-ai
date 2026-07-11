import { describe, it, expect } from "vitest";
import { calculateReadiness, Requirement } from "../readiness";
import { evaluateSlotCandidates, CandidateInput } from "../slot-rescue";

describe("Readiness Engine Tests", () => {
  it("should calculate 100% readiness for completed requirements", () => {
    const requirements: Requirement[] = [
      { id: "1", requirementType: "identity_confirmed", category: "patient_prep", status: "completed", severity: "critical" },
      { id: "2", requirementType: "surgical_consent", category: "patient_prep", status: "completed", severity: "critical" },
    ];
    const result = calculateReadiness(requirements);
    expect(result.score).toBe(100);
    expect(result.status).toBe("ready");
    expect(result.hardBlockers).toHaveLength(0);
  });

  it("should identify missing critical requirements as hard blockers", () => {
    const requirements: Requirement[] = [
      { id: "1", requirementType: "identity_confirmed", category: "patient_prep", status: "completed", severity: "critical" },
      { id: "2", requirementType: "insurance_authorization", category: "operational_logistical", status: "missing", severity: "critical" },
    ];
    const result = calculateReadiness(requirements);
    expect(result.score).toBeLessThan(90);
    expect(result.status).toBe("blocked"); // missing on critical -> blocker
    expect(result.hardBlockers).toContain("insurance authorization (missing)");
  });

  it("should calculate exactly 64% readiness for the CR-1051 initial state", () => {
    const requirements: Requirement[] = [
      { id: "1", requirementType: "identity_confirmed", category: "patient_prep", status: "completed", severity: "critical" },
      { id: "2", requirementType: "surgical_consent", category: "patient_prep", status: "completed", severity: "critical" },
      { id: "3", requirementType: "anaesthesia_review", category: "clinical_clearance", status: "pending", severity: "critical" },
      { id: "4", requirementType: "pre_op_labs", category: "clinical_clearance", status: "clinical_review", severity: "medium" },
      { id: "5", requirementType: "insurance_authorization", category: "operational_logistical", status: "blocked", severity: "critical" },
    ];
    const result = calculateReadiness(requirements);
    expect(result.score).toBe(64);
    expect(result.status).toBe("blocked"); // because it has a 'blocked' status
    expect(result.hardBlockers).toContain("insurance authorization (blocked)");
  });
});

describe("Slot Rescue Candidate Tests", () => {
  it("should exclude candidate when standby consent is false", () => {
    const candidates: CandidateInput[] = [
      {
        caseId: "c-1",
        caseNumber: "CR-101",
        patientName: "John Doe",
        procedureName: "FESS",
        durationMinutes: 60,
        readinessScore: 95,
        standbyConsent: false,
        availabilityStatus: "confirmed",
        teamCompatible: true,
        equipmentAvailable: true,
        bedAvailable: true,
        hasHardBlockers: false,
      },
    ];
    const results = evaluateSlotCandidates(75, candidates);
    expect(results[0].eligible).toBe(false);
    expect(results[0].failedConstraints).toContain("No standby consent");
  });

  it("should exclude candidate when duration exceeds slot", () => {
    const candidates: CandidateInput[] = [
      {
        caseId: "c-2",
        caseNumber: "CR-102",
        patientName: "Jane Smith",
        procedureName: "TKA",
        durationMinutes: 120,
        readinessScore: 98,
        standbyConsent: true,
        availabilityStatus: "confirmed",
        teamCompatible: true,
        equipmentAvailable: true,
        bedAvailable: true,
        hasHardBlockers: false,
      },
    ];
    const results = evaluateSlotCandidates(75, candidates);
    expect(results[0].eligible).toBe(false);
    expect(results[0].failedConstraints[0]).toContain("Duration exceeds slot");
  });

  it("should rank eligible candidates and generate correct scoring reason", () => {
    const candidates: CandidateInput[] = [
      {
        caseId: "c-3",
        caseNumber: "CR-103",
        patientName: "A. Al Zaabi",
        procedureName: "FESS",
        durationMinutes: 70,
        readinessScore: 98,
        standbyConsent: true,
        availabilityStatus: "confirmed",
        teamCompatible: true,
        equipmentAvailable: true,
        bedAvailable: true,
        hasHardBlockers: false,
      },
    ];
    const results = evaluateSlotCandidates(75, candidates);
    expect(results[0].eligible).toBe(true);
    expect(results[0].overallScore).toBeGreaterThanOrEqual(90);
    expect(results[0].rankingReason).toContain("perfectly");
  });
});
