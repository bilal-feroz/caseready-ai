import { db } from "../src/db/client.ts";
import * as schema from "../src/db/schema.ts";
import bcrypt from "bcryptjs";

async function main() {
  if (process.env.DEMO_MODE === "false") {
    throw new Error("Refusing to seed demo records because DEMO_MODE=false.");
  }

  console.log("Seeding database...");

  // Clear existing rows from child tables before parent tables.
  db.delete(schema.replacementProposals).run();
  db.delete(schema.standbyCandidates).run();
  db.delete(schema.operatingRoomSlots).run();
  db.delete(schema.communications).run();
  db.delete(schema.actionItems).run();
  db.delete(schema.evidenceDocuments).run();
  db.delete(schema.readinessRequirements).run();
  db.delete(schema.auditEvents).run();
  db.delete(schema.systemSettings).run();
  db.delete(schema.surgicalCases).run();
  db.delete(schema.patients).run();
  db.delete(schema.surgeons).run();
  db.delete(schema.operatingRooms).run();
  db.delete(schema.users).run();

  // Hash password
  const passwordHash = await bcrypt.hash("Demo123!", 10);

  // 1. Seed Users
  db.insert(schema.users).values([
    {
      id: "u-1",
      email: "coordinator@caseready.demo",
      passwordHash,
      fullName: "Aisha Rahman",
      role: "coordinator",
      department: "Pre-Admissions",
    },
    {
      id: "u-2",
      email: "clinician@caseready.demo",
      passwordHash,
      fullName: "Dr. Leila Hassan",
      role: "clinical_reviewer",
      department: "Surgical Services",
    },
    {
      id: "u-3",
      email: "scheduling@caseready.demo",
      passwordHash,
      fullName: "Faisal Al Blooshi",
      role: "scheduling_officer",
      department: "Operations",
    },
    {
      id: "u-4",
      email: "admin@caseready.demo",
      passwordHash,
      fullName: "System Admin",
      role: "administrator",
      department: "IT",
    },
  ]).run();

  // 2. Seed Operating Rooms
  db.insert(schema.operatingRooms).values([
    { id: "or-1", code: "OR 01", name: "Operating Room 1", capabilitiesJson: JSON.stringify(["General", "Orthopedic"]), active: true },
    { id: "or-2", code: "OR 02", name: "Operating Room 2", capabilitiesJson: JSON.stringify(["Orthopedic", "Neurology"]), active: true },
    { id: "or-3", code: "OR 03", name: "Operating Room 3", capabilitiesJson: JSON.stringify(["ENT", "General"]), active: true },
    { id: "or-4", code: "OR 04", name: "Operating Room 4", capabilitiesJson: JSON.stringify(["Cardio", "Vascular"]), active: true },
    { id: "or-5", code: "OR 05", name: "Operating Room 5", capabilitiesJson: JSON.stringify(["General"]), active: true },
    { id: "or-6", code: "OR 06", name: "Operating Room 6", capabilitiesJson: JSON.stringify(["Gynaecology"]), active: true },
  ]).run();

  // 3. Seed Surgeons
  db.insert(schema.surgeons).values([
    { id: "s-1", fullName: "Dr. Leila Hassan", specialty: "Orthopedic Surgery" },
    { id: "s-2", fullName: "Dr. S. Khalfan", specialty: "Orthopedic Surgery" },
    { id: "s-3", fullName: "Dr. R. Haddad", specialty: "General Surgery" },
    { id: "s-4", fullName: "Dr. T. Rahman", specialty: "Neurosurgery" },
    { id: "s-5", fullName: "Dr. M. Fayed", specialty: "ENT Surgery" },
  ]).run();

  // 4. Seed Patients
  db.insert(schema.patients).values([
    { id: "p-1", syntheticPatientId: "MRN-98234-A", maskedName: "M. Al Nuaimi", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-2", syntheticPatientId: "MRN-44102-B", maskedName: "A. Saeed", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-3", syntheticPatientId: "MRN-11299-C", maskedName: "F. Mansoor", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-4", syntheticPatientId: "MRN-77812-D", maskedName: "S. Abdullah", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-5", syntheticPatientId: "MRN-33211-E", maskedName: "K. Jaber", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-6", syntheticPatientId: "MRN-55421-F", maskedName: "L. Tariq", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-7", syntheticPatientId: "MRN-1051-X", maskedName: "S. Rahman", standbyConsent: false, availabilityStatus: "confirmed" }, // Primary Case Patient
    { id: "p-8", syntheticPatientId: "MRN-99881-Z", maskedName: "A. Al Zaabi", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-9", syntheticPatientId: "MRN-88772-Y", maskedName: "K. Mahmoud", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-10", syntheticPatientId: "MRN-77663-X", maskedName: "S. Khan", standbyConsent: true, availabilityStatus: "pending" },
    { id: "p-11", syntheticPatientId: "MRN-66554-W", maskedName: "F. Al Mansouri", standbyConsent: true, availabilityStatus: "unavailable" },
  ]).run();

  // 5. Seed Surgical Cases
  // We need 18 cases total.
  const casesData = [
    { id: "c-1051", caseNumber: "CR-1051", patientId: "p-7", surgeonId: "s-1", operatingRoomId: "or-2", procedureName: "Total Knee Replacement", procedureCategory: "Orthopedic", scheduledStart: "2026-07-13T09:15:00Z", scheduledEnd: "2026-07-13T11:15:00Z", durationMinutes: 120, readinessScore: 64, readinessStatus: "at_risk", caseStatus: "scheduled" },
    { id: "c-1", caseNumber: "CR-1001", patientId: "p-1", surgeonId: "s-2", operatingRoomId: "or-1", procedureName: "Total Knee Arthroplasty", procedureCategory: "Orthopedic", scheduledStart: "2026-07-13T08:00:00Z", scheduledEnd: "2026-07-13T10:00:00Z", durationMinutes: 120, readinessScore: 100, readinessStatus: "ready", caseStatus: "scheduled" },
    { id: "c-2", caseNumber: "CR-1002", patientId: "p-2", surgeonId: "s-3", operatingRoomId: "or-2", procedureName: "Laparoscopic Cholecystectomy", procedureCategory: "General", scheduledStart: "2026-07-13T10:30:00Z", scheduledEnd: "2026-07-13T12:00:00Z", durationMinutes: 90, readinessScore: 85, readinessStatus: "at_risk", caseStatus: "scheduled" },
    { id: "c-3", caseNumber: "CR-1003", patientId: "p-3", surgeonId: "s-4", operatingRoomId: "or-1", procedureName: "Spinal Fusion (L4-L5)", procedureCategory: "Neurology", scheduledStart: "2026-07-13T12:00:00Z", scheduledEnd: "2026-07-13T14:30:00Z", durationMinutes: 150, readinessScore: 40, readinessStatus: "blocked", caseStatus: "scheduled" },
    { id: "c-4", caseNumber: "CR-1004", patientId: "p-4", surgeonId: "s-2", operatingRoomId: "or-1", procedureName: "Arthroscopy", procedureCategory: "Orthopedic", scheduledStart: "2026-07-13T15:00:00Z", scheduledEnd: "2026-07-13T16:30:00Z", durationMinutes: 90, readinessScore: 100, readinessStatus: "ready", caseStatus: "scheduled" },
    { id: "c-5", caseNumber: "CR-1005", patientId: "p-5", surgeonId: "s-3", operatingRoomId: "or-2", procedureName: "Hernia Repair", procedureCategory: "General", scheduledStart: "2026-07-13T16:30:00Z", scheduledEnd: "2026-07-13T18:00:00Z", durationMinutes: 90, readinessScore: 95, readinessStatus: "ready", caseStatus: "scheduled" },
    { id: "c-6", caseNumber: "CR-1006", patientId: "p-6", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Tympanoplasty", procedureCategory: "ENT", scheduledStart: "2026-07-13T18:00:00Z", scheduledEnd: "2026-07-13T19:30:00Z", durationMinutes: 90, readinessScore: 80, readinessStatus: "at_risk", caseStatus: "scheduled" },
    { id: "c-1057", caseNumber: "CR-1057", patientId: "p-11", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Endoscopic sinus surgery", procedureCategory: "ENT", scheduledStart: "2026-07-13T11:45:00Z", scheduledEnd: "2026-07-13T13:00:00Z", durationMinutes: 75, readinessScore: 60, readinessStatus: "blocked", caseStatus: "cancelled", cancellationReason: "Patient unavailable" },
  ];

  // Add remaining 10 dummy cases to reach 18
  for (let i = 7; i <= 16; i++) {
    casesData.push({
      id: `c-dummy-${i}`,
      caseNumber: `CR-10${i}`,
      patientId: `p-${(i % 6) + 1}`,
      surgeonId: `s-${(i % 5) + 1}`,
      operatingRoomId: `or-${(i % 6) + 1}`,
      procedureName: `Routine Procedure ${i}`,
      procedureCategory: "General",
      scheduledStart: `2026-07-13T08:00:00Z`,
      scheduledEnd: `2026-07-13T09:30:00Z`,
      durationMinutes: 90,
      readinessScore: 90,
      readinessStatus: "ready",
      caseStatus: "scheduled"
    });
  }

  db.insert(schema.surgicalCases).values(casesData).run();

  // 6. Seed Requirements
  // We need requirements for CR-1051
  db.insert(schema.readinessRequirements).values([
    { id: "r-1051-1", surgicalCaseId: "c-1051", category: "patient_prep", requirementType: "identity_confirmed", status: "completed", severity: "critical", ownerDepartment: "Pre-Admissions" },
    { id: "r-1051-2", surgicalCaseId: "c-1051", category: "patient_prep", requirementType: "surgical_consent", status: "completed", severity: "critical", ownerDepartment: "Pre-Admissions" },
    { id: "r-1051-3", surgicalCaseId: "c-1051", category: "clinical_clearance", requirementType: "anaesthesia_review", status: "pending", severity: "critical", ownerDepartment: "Clinical Review" },
    { id: "r-1051-4", surgicalCaseId: "c-1051", category: "clinical_clearance", requirementType: "pre_op_labs", status: "clinical_review", severity: "medium", ownerDepartment: "Clinical Review" },
    { id: "r-1051-5", surgicalCaseId: "c-1051", category: "operational_logistical", requirementType: "insurance_authorization", status: "blocked", severity: "critical", ownerDepartment: "Finance" },
  ]).run();

  // Seeding requirements for the other cases
  casesData.forEach(c => {
    if (c.id === "c-1051") return;
    db.insert(schema.readinessRequirements).values([
      { id: `r-${c.id}-1`, surgicalCaseId: c.id, category: "patient_prep", requirementType: "identity_confirmed", status: "completed", severity: "critical", ownerDepartment: "Pre-Admissions" },
      { id: `r-${c.id}-2`, surgicalCaseId: c.id, category: "patient_prep", requirementType: "surgical_consent", status: c.readinessStatus === "blocked" ? "pending" : "completed", severity: "critical", ownerDepartment: "Pre-Admissions" },
    ]).run();
  });

  // 7. Seed Action Items (at least 12 items)
  db.insert(schema.actionItems).values([
    { id: "a-1", surgicalCaseId: "c-1051", requirementId: "r-1051-5", title: "Review Insurance Auth Document", description: "Insurance authorization attachment missing from Daman portal. Surgery cannot proceed without financial clearance.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Finance", requiresApproval: true },
    { id: "a-2", surgicalCaseId: "c-1051", requirementId: "r-1051-3", title: "Anaesthesia Review Pending Signature", description: "Anaesthesia assessment awaiting physician signature in medical portal.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Clinical Review", requiresApproval: false },
    { id: "a-3", surgicalCaseId: "c-1051", requirementId: "r-1051-4", title: "Perform Clinical Review of Labs", description: "HbA1c matches warning criteria (6.1% > 6.0%) for procedure protocol Ortho-TK-01. Review required.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Clinical Review", requiresApproval: false },
    // Mock action item #CR-902
    { id: "a-4", surgicalCaseId: "c-2", requirementId: `r-c-2-2`, title: "Verify AI Patient Comms", description: "Intent: Confirm patient understanding of pre-op medication instructions (Aspirin cessation). Recipient prefers WhatsApp communication. Bilingual requested.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Pre-Admissions", requiresApproval: true },
    // Fill up to 12 actions
  ]).run();

  for (let i = 5; i <= 14; i++) {
    db.insert(schema.actionItems).values({
      id: `a-${i}`,
      surgicalCaseId: "c-3",
      requirementId: `r-c-3-2`,
      title: `Action Item ${i}`,
      description: `Description of action item ${i}`,
      actionType: "verify_implant",
      priority: "medium",
      status: "pending",
      ownerDepartment: "Procurement",
      requiresApproval: false
    }).run();
  }

  // 8. Seed Communications
  db.insert(schema.communications).values([
    {
      id: "com-1",
      actionItemId: "a-4",
      surgicalCaseId: "c-2",
      language: "en/ar",
      recipientType: "patient",
      draftContent: JSON.stringify({
        en: "Hello, this is the pre-admission team regarding your upcoming procedure. Please confirm that you have received and understood your medication instructions.",
        ar: "مرحباً، هذا فريق ما قبل الإدخال بخصوص عمليتكم الجراحية القادمة. يرجى تأكيد استلامكم وفهمكم لتعليمات الأدوية."
      }),
      status: "draft"
    }
  ]).run();

  // 9. Seed Evidence Documents
  db.insert(schema.evidenceDocuments).values([
    {
      id: "e-1",
      surgicalCaseId: "c-1051",
      requirementId: "r-1051-4",
      title: "Med-Path Labs Report",
      documentType: "PDF Scan",
      extractedText: "Patient: Eliza Vance, HbA1c: 6.1%",
      confidence: 92,
      synthetic: true,
      reviewStatus: "pending"
    }
  ]).run();

  // 10. Seed Slot Rescue Slot
  db.insert(schema.operatingRoomSlots).values([
    {
      id: "slot-1",
      operatingRoomId: "or-3",
      originalCaseId: "c-1057",
      startTime: "2026-07-13T11:45:00Z",
      endTime: "2026-07-13T13:00:00Z",
      durationMinutes: 75,
      status: "endangered"
    }
  ]).run();

  // 11. Seed Standby Candidates
  db.insert(schema.standbyCandidates).values([
    {
      id: "cand-1",
      slotId: "slot-1",
      surgicalCaseId: "c-1", // A. Al Zaabi (use dummy case or associate)
      durationScore: 100,
      teamScore: 100,
      equipmentScore: 100,
      readinessScore: 98,
      availabilityScore: 100,
      overallScore: 99,
      eligible: true,
      failedConstraintsJson: JSON.stringify([]),
      rankingReason: "Fits available slot perfectly (70 min est.), same room setup, clinically cleared, and patient ready."
    },
    {
      id: "cand-2",
      slotId: "slot-1",
      surgicalCaseId: "c-2", // K. Mahmoud
      durationScore: 90,
      teamScore: 100,
      equipmentScore: 100,
      readinessScore: 92,
      availabilityScore: 100,
      overallScore: 94,
      eligible: true,
      failedConstraintsJson: JSON.stringify([]),
      rankingReason: "Good fit (60 min est.), but slightly lower readiness score."
    },
    {
      id: "cand-3",
      slotId: "slot-1",
      surgicalCaseId: "c-3", // S. Khan
      durationScore: 80,
      teamScore: 80,
      equipmentScore: 50,
      readinessScore: 85,
      availabilityScore: 50,
      overallScore: 68,
      eligible: true,
      failedConstraintsJson: JSON.stringify([]),
      rankingReason: "Matches duration but requires additional instrument sets."
    },
    {
      id: "cand-4",
      slotId: "slot-1",
      surgicalCaseId: "c-4", // F. Al Mansouri
      durationScore: 20,
      teamScore: 0,
      equipmentScore: 0,
      readinessScore: 60,
      availabilityScore: 0,
      overallScore: 0,
      eligible: false,
      failedConstraintsJson: JSON.stringify(["Duration exceeds slot", "Surgeon unavailable"]),
      rankingReason: "Excluded: Exceeds slot length and surgeon unavailable."
    }
  ]).run();

  // 12. Seed System Settings
  db.insert(schema.systemSettings).values([
    {
      id: "s-1",
      key: "hospital_name",
      valueJson: JSON.stringify("Burjeel Hospital, Abu Dhabi"),
    },
    {
      id: "s-2",
      key: "warning_threshold",
      valueJson: JSON.stringify(75),
    },
    {
      id: "s-3",
      key: "critical_threshold",
      valueJson: JSON.stringify(60),
    }
  ]).run();

  // 13. Seed Audit Events (at least 20 items)
  const auditEventsData = [];
  for (let i = 1; i <= 22; i++) {
    auditEventsData.push({
      id: `au-${i}`,
      caseId: "c-1051",
      actorUserId: "u-1",
      actorType: "user",
      eventType: i % 2 === 0 ? "readiness_recalculated" : "status_check",
      entityType: "surgical_case",
      entityId: "c-1051",
      previousStateJson: JSON.stringify({ readiness: 60 }),
      newStateJson: JSON.stringify({ readiness: 64 }),
      reason: "Routine readiness baseline check"
    });
  }
  db.insert(schema.auditEvents).values(auditEventsData).run();

  console.log("Seeding completed successfully.");
}

main().catch(err => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
