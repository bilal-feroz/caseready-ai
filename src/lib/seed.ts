import bcrypt from "bcryptjs";
import { db, ensureSchema } from "../db/client";
import * as schema from "../db/schema";
import type { RequirementStatus } from "../db/schema";
import { calculateReadiness } from "./readiness";
import { evaluateSlotCandidates, type CandidateInput } from "./slot-rescue";

type Severity = "critical" | "medium" | "low";

interface ReqSpec {
  n: number;
  category: string;
  requirementType: string;
  status: RequirementStatus;
  severity: Severity;
  owner: string;
  notes?: string;
  dueAt?: string;
}

// Demo world: tomorrow's operating list is Monday 13 July 2026; planning happens 12 July.
const PLAN_DAY = "2026-07-12";
const OP_DAY = "2026-07-13";
const iso = (day: string, time: string) => `${day}T${time}:00Z`;

const READY_SET: Omit<ReqSpec, "n">[] = [
  { category: "patient_prep", requirementType: "identity_confirmed", status: "completed", severity: "critical", owner: "Pre-Admissions" },
  { category: "patient_prep", requirementType: "surgical_consent", status: "completed", severity: "critical", owner: "Pre-Admissions" },
  { category: "clinical_clearance", requirementType: "anaesthesia_review", status: "completed", severity: "critical", owner: "Anaesthesia" },
  { category: "clinical_clearance", requirementType: "pre_op_labs", status: "completed", severity: "medium", owner: "Laboratory" },
  { category: "operational_logistical", requirementType: "insurance_authorization", status: "completed", severity: "critical", owner: "Finance" },
];

function reqsFor(caseId: string, overrides: Partial<Record<number, Partial<ReqSpec>>> = {}): ReqSpec[] {
  return READY_SET.map((base, i) => {
    const n = i + 1;
    return { n, ...base, ...(overrides[n] || {}) } as ReqSpec;
  });
}

interface CaseDef {
  id: string;
  caseNumber: string;
  patientId: string;
  surgeonId: string;
  operatingRoomId: string;
  procedureName: string;
  procedureCategory: string;
  start: string;
  durationMinutes: number;
  reqs: ReqSpec[];
}

export async function seedDatabase() {
  if (process.env.DEMO_MODE === "false") {
    throw new Error("Refusing to seed demo records because DEMO_MODE=false.");
  }

  // Make sure the schema exists (no-op if already provisioned).
  await ensureSchema();

  // Clear child tables before parents.
  await db.delete(schema.replacementProposals);
  await db.delete(schema.standbyCandidates);
  await db.delete(schema.operatingRoomSlots);
  await db.delete(schema.communications);
  await db.delete(schema.actionItems);
  await db.delete(schema.evidenceDocuments);
  await db.delete(schema.readinessRequirements);
  await db.delete(schema.auditEvents);
  await db.delete(schema.systemSettings);
  await db.delete(schema.surgicalCases);
  await db.delete(schema.patients);
  await db.delete(schema.surgeons);
  await db.delete(schema.operatingRooms);
  await db.delete(schema.users);

  const passwordHash = await bcrypt.hash("Demo123!", 10);

  // 1. Users
  await db.insert(schema.users).values([
    { id: "u-1", email: "coordinator@caseready.demo", passwordHash, fullName: "Aisha Rahman", role: "coordinator", department: "Pre-Admissions" },
    { id: "u-2", email: "clinician@caseready.demo", passwordHash, fullName: "Dr. Leila Hassan", role: "clinical_reviewer", department: "Surgical Services" },
    { id: "u-3", email: "scheduling@caseready.demo", passwordHash, fullName: "Faisal Al Blooshi", role: "scheduling_officer", department: "Operations" },
    { id: "u-4", email: "admin@caseready.demo", passwordHash, fullName: "System Admin", role: "administrator", department: "IT" },
  ]).run();

  // 2. Operating rooms
  await db.insert(schema.operatingRooms).values([
    { id: "or-1", code: "OR 01", name: "Operating Room 1", capabilitiesJson: JSON.stringify(["General", "Orthopedic"]), active: true },
    { id: "or-2", code: "OR 02", name: "Operating Room 2", capabilitiesJson: JSON.stringify(["Orthopedic", "Neurology"]), active: true },
    { id: "or-3", code: "OR 03", name: "Operating Room 3", capabilitiesJson: JSON.stringify(["ENT", "General"]), active: true },
    { id: "or-4", code: "OR 04", name: "Operating Room 4", capabilitiesJson: JSON.stringify(["Cardio", "Vascular"]), active: true },
    { id: "or-5", code: "OR 05", name: "Operating Room 5", capabilitiesJson: JSON.stringify(["General"]), active: true },
    { id: "or-6", code: "OR 06", name: "Operating Room 6", capabilitiesJson: JSON.stringify(["Ophthalmology", "General"]), active: true },
  ]).run();

  // 3. Surgeons (names stored without title; UI adds "Dr.")
  await db.insert(schema.surgeons).values([
    { id: "s-1", fullName: "Leila Hassan", specialty: "Orthopedic Surgery" },
    { id: "s-2", fullName: "Sami Khalfan", specialty: "Orthopedic Surgery" },
    { id: "s-3", fullName: "Rania Haddad", specialty: "General Surgery" },
    { id: "s-4", fullName: "Tariq Rahman", specialty: "Neurosurgery" },
    { id: "s-5", fullName: "Mona Fayed", specialty: "ENT Surgery" },
  ]).run();

  // 4. Patients
  await db.insert(schema.patients).values([
    { id: "p-1", syntheticPatientId: "MRN-98234-A", maskedName: "M. Al Nuaimi", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-2", syntheticPatientId: "MRN-44102-B", maskedName: "A. Saeed", preferredLanguage: "ar", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-3", syntheticPatientId: "MRN-11299-C", maskedName: "F. Mansoor", standbyConsent: false, availabilityStatus: "confirmed" },
    { id: "p-4", syntheticPatientId: "MRN-77812-D", maskedName: "S. Abdullah", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-5", syntheticPatientId: "MRN-33211-E", maskedName: "K. Jaber", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-6", syntheticPatientId: "MRN-55421-F", maskedName: "L. Tariq", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-7", syntheticPatientId: "MRN-1051-X", maskedName: "S. Rahman", preferredLanguage: "ar", standbyConsent: false, availabilityStatus: "confirmed" },
    { id: "p-8", syntheticPatientId: "MRN-99881-Z", maskedName: "A. Al Zaabi", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-9", syntheticPatientId: "MRN-88772-Y", maskedName: "K. Mahmoud", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-10", syntheticPatientId: "MRN-77663-W", maskedName: "H. Al Shamsi", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-11", syntheticPatientId: "MRN-66554-V", maskedName: "F. Al Mansouri", standbyConsent: true, availabilityStatus: "unavailable" },
    // Standby pool patients
    { id: "p-12", syntheticPatientId: "MRN-30012-S", maskedName: "N. Yusuf", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-13", syntheticPatientId: "MRN-30045-S", maskedName: "R. Ahmed", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-14", syntheticPatientId: "MRN-30078-S", maskedName: "D. Iqbal", standbyConsent: true, availabilityStatus: "confirmed" },
    { id: "p-15", syntheticPatientId: "MRN-30091-S", maskedName: "T. Farooq", standbyConsent: true, availabilityStatus: "pending" },
    { id: "p-16", syntheticPatientId: "MRN-30110-S", maskedName: "B. Nasser", standbyConsent: false, availabilityStatus: "confirmed" },
  ]).run();

  // 5. Scheduled cases with per-case requirement profiles (readiness computed from requirements)
  const scheduled: CaseDef[] = [
    {
      id: "c-1051", caseNumber: "CR-1051", patientId: "p-7", surgeonId: "s-1", operatingRoomId: "or-2",
      procedureName: "Total Knee Replacement", procedureCategory: "Orthopedic", start: iso(OP_DAY, "09:15"), durationMinutes: 120,
      reqs: reqsFor("c-1051", {
        3: { status: "pending", notes: "Awaiting anaesthesia physician sign-off." },
        4: { status: "clinical_review", notes: "HbA1c 6.1% flagged against Ortho-TK-01 protocol." },
        5: { status: "blocked", notes: "Daman authorization attachment missing.", owner: "Finance" },
      }),
    },
    {
      id: "c-1", caseNumber: "CR-1001", patientId: "p-1", surgeonId: "s-2", operatingRoomId: "or-1",
      procedureName: "Total Knee Arthroplasty", procedureCategory: "Orthopedic", start: iso(OP_DAY, "08:00"), durationMinutes: 120,
      reqs: reqsFor("c-1"),
    },
    {
      id: "c-2", caseNumber: "CR-1002", patientId: "p-2", surgeonId: "s-3", operatingRoomId: "or-2",
      procedureName: "Laparoscopic Cholecystectomy", procedureCategory: "General", start: iso(OP_DAY, "10:30"), durationMinutes: 90,
      reqs: reqsFor("c-2", { 4: { status: "pending", notes: "Patient must confirm aspirin cessation." } }),
    },
    {
      id: "c-3", caseNumber: "CR-1003", patientId: "p-3", surgeonId: "s-4", operatingRoomId: "or-1",
      procedureName: "Spinal Fusion (L4-L5)", procedureCategory: "Neurology", start: iso(OP_DAY, "12:00"), durationMinutes: 150,
      reqs: reqsFor("c-3", {
        3: { status: "blocked", notes: "Cardiology clearance rejected (abnormal ECG).", owner: "Cardiology" },
        5: { status: "missing", notes: "Pre-authorization not yet submitted.", owner: "Finance" },
      }),
    },
    {
      id: "c-4", caseNumber: "CR-1004", patientId: "p-4", surgeonId: "s-2", operatingRoomId: "or-1",
      procedureName: "Knee Arthroscopy", procedureCategory: "Orthopedic", start: iso(OP_DAY, "15:00"), durationMinutes: 90,
      reqs: reqsFor("c-4"),
    },
    {
      id: "c-5", caseNumber: "CR-1005", patientId: "p-5", surgeonId: "s-3", operatingRoomId: "or-2",
      procedureName: "Open Hernia Repair", procedureCategory: "General", start: iso(OP_DAY, "16:30"), durationMinutes: 90,
      reqs: reqsFor("c-5"),
    },
    {
      id: "c-6", caseNumber: "CR-1006", patientId: "p-6", surgeonId: "s-5", operatingRoomId: "or-3",
      procedureName: "Tympanoplasty", procedureCategory: "ENT", start: iso(OP_DAY, "18:00"), durationMinutes: 90,
      reqs: reqsFor("c-6", { 4: { status: "pending", notes: "Pre-op bloodwork pending; lab SLA exceeded by 4h." } }),
    },
    {
      id: "c-7", caseNumber: "CR-1007", patientId: "p-8", surgeonId: "s-3", operatingRoomId: "or-5",
      procedureName: "Laparoscopic Appendectomy", procedureCategory: "General", start: iso(OP_DAY, "08:30"), durationMinutes: 60,
      reqs: reqsFor("c-7"),
    },
    {
      id: "c-8", caseNumber: "CR-1008", patientId: "p-9", surgeonId: "s-2", operatingRoomId: "or-6",
      procedureName: "Cataract Extraction (Phaco)", procedureCategory: "Ophthalmology", start: iso(OP_DAY, "09:00"), durationMinutes: 45,
      reqs: reqsFor("c-8"),
    },
    {
      id: "c-9", caseNumber: "CR-1009", patientId: "p-10", surgeonId: "s-1", operatingRoomId: "or-1",
      procedureName: "Total Hip Replacement", procedureCategory: "Orthopedic", start: iso(OP_DAY, "10:45"), durationMinutes: 135,
      reqs: reqsFor("c-9"),
    },
    {
      id: "c-10", caseNumber: "CR-1010", patientId: "p-5", surgeonId: "s-3", operatingRoomId: "or-5",
      procedureName: "Thyroidectomy", procedureCategory: "General", start: iso(OP_DAY, "11:30"), durationMinutes: 120,
      reqs: reqsFor("c-10", { 2: { status: "pending", notes: "Surgical consent awaiting patient signature." } }),
    },
    {
      id: "c-11", caseNumber: "CR-1011", patientId: "p-4", surgeonId: "s-2", operatingRoomId: "or-4",
      procedureName: "Inguinal Hernia Repair", procedureCategory: "General", start: iso(OP_DAY, "13:30"), durationMinutes: 75,
      reqs: reqsFor("c-11"),
    },
  ];

  // Cancelled case that frees the endangered slot.
  const cancelled: CaseDef = {
    id: "c-1057", caseNumber: "CR-1057", patientId: "p-11", surgeonId: "s-5", operatingRoomId: "or-3",
    procedureName: "Endoscopic sinus surgery", procedureCategory: "ENT", start: iso(OP_DAY, "11:45"), durationMinutes: 75,
    reqs: reqsFor("c-1057"),
  };

  // Standby pool cases (not on tomorrow's list; candidates for slot rescue).
  interface StandbyDef extends CaseDef { readiness: number; teamCompatible: boolean; equipmentAvailable: boolean; bedAvailable: boolean; }
  const standby: StandbyDef[] = [
    { id: "sc-1", caseNumber: "CR-2001", patientId: "p-12", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Endoscopic Sinus Revision", procedureCategory: "ENT", start: iso(OP_DAY, "00:00"), durationMinutes: 60, reqs: [], readiness: 96, teamCompatible: true, equipmentAvailable: true, bedAvailable: true },
    { id: "sc-2", caseNumber: "CR-2002", patientId: "p-13", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Tonsillectomy", procedureCategory: "ENT", start: iso(OP_DAY, "00:00"), durationMinutes: 45, reqs: [], readiness: 92, teamCompatible: true, equipmentAvailable: true, bedAvailable: true },
    { id: "sc-3", caseNumber: "CR-2003", patientId: "p-14", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Septoplasty", procedureCategory: "ENT", start: iso(OP_DAY, "00:00"), durationMinutes: 75, reqs: [], readiness: 100, teamCompatible: true, equipmentAvailable: true, bedAvailable: true },
    { id: "sc-4", caseNumber: "CR-2004", patientId: "p-15", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Functional Rhinoplasty", procedureCategory: "ENT", start: iso(OP_DAY, "00:00"), durationMinutes: 120, reqs: [], readiness: 90, teamCompatible: true, equipmentAvailable: true, bedAvailable: true },
    { id: "sc-5", caseNumber: "CR-2005", patientId: "p-16", surgeonId: "s-5", operatingRoomId: "or-3", procedureName: "Grommet Insertion", procedureCategory: "ENT", start: iso(OP_DAY, "00:00"), durationMinutes: 30, reqs: [], readiness: 88, teamCompatible: true, equipmentAvailable: false, bedAvailable: true },
  ];

  // Insert cases (compute readiness for scheduled + cancelled from their requirements).
  const withReqs = [...scheduled, cancelled];
  const caseRows = withReqs.map((c) => {
    const calc = calculateReadiness(
      c.reqs.map((r) => ({ id: `r-${c.id}-${r.n}`, requirementType: r.requirementType, category: r.category, status: r.status, severity: r.severity }))
    );
    return {
      id: c.id, caseNumber: c.caseNumber, patientId: c.patientId, surgeonId: c.surgeonId, operatingRoomId: c.operatingRoomId,
      procedureName: c.procedureName, procedureCategory: c.procedureCategory,
      scheduledStart: c.start, scheduledEnd: new Date(new Date(c.start).getTime() + c.durationMinutes * 60000).toISOString(),
      durationMinutes: c.durationMinutes, readinessScore: calc.score, readinessStatus: calc.status,
      caseStatus: c.id === "c-1057" ? "cancelled" : "scheduled",
      cancellationReason: c.id === "c-1057" ? "Patient unavailable (admitted for observation)" : null,
    };
  });

  const standbyRows = standby.map((c) => ({
    id: c.id, caseNumber: c.caseNumber, patientId: c.patientId, surgeonId: c.surgeonId, operatingRoomId: c.operatingRoomId,
    procedureName: c.procedureName, procedureCategory: c.procedureCategory,
    scheduledStart: c.start, scheduledEnd: c.start, durationMinutes: c.durationMinutes,
    readinessScore: c.readiness, readinessStatus: "ready", caseStatus: "standby", cancellationReason: null,
  }));

  await db.insert(schema.surgicalCases).values([...caseRows, ...standbyRows]).run();

  // 6. Requirements
  const reqRows = withReqs.flatMap((c) =>
    c.reqs.map((r) => ({
      id: `r-${c.id}-${r.n}`, surgicalCaseId: c.id, category: r.category, requirementType: r.requirementType,
      status: r.status, severity: r.severity, ownerDepartment: r.owner, notes: r.notes ?? null,
      dueAt: r.dueAt ?? iso(OP_DAY, "07:00"),
    }))
  );
  await db.insert(schema.readinessRequirements).values(reqRows).run();

  // 7. Action items (varied; includes completed + overdue examples)
  await db.insert(schema.actionItems).values([
    { id: "a-1", surgicalCaseId: "c-1051", requirementId: "r-c-1051-5", title: "Attach insurance authorization", description: "Authorization attachment missing from Daman portal. Surgery cannot proceed without financial clearance.", actionType: "lab_followup", priority: "high", status: "pending", ownerDepartment: "Finance", requiresApproval: false, dueAt: iso(OP_DAY, "07:30"), createdAt: iso(PLAN_DAY, "14:10") },
    { id: "a-2", surgicalCaseId: "c-1051", requirementId: "r-c-1051-3", title: "Chase anaesthesia sign-off", description: "Anaesthesia assessment awaiting physician signature in the medical portal.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Anaesthesia", requiresApproval: false, dueAt: iso(OP_DAY, "07:00"), createdAt: iso(PLAN_DAY, "14:12") },
    { id: "a-3", surgicalCaseId: "c-1051", requirementId: "r-c-1051-4", title: "Clinical review of pre-op labs", description: "HbA1c 6.1% exceeds the 6.0% protocol threshold for Ortho-TK-01. Clinical review required.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Clinical Review", requiresApproval: false, dueAt: iso(OP_DAY, "06:30"), createdAt: iso(PLAN_DAY, "14:15") },
    { id: "a-4", surgicalCaseId: "c-2", requirementId: "r-c-2-4", title: "Approve patient pre-op message", description: "Confirm patient understanding of pre-op medication instructions (aspirin cessation). Bilingual message, patient prefers WhatsApp.", actionType: "review_comms", priority: "high", status: "pending", ownerDepartment: "Pre-Admissions", requiresApproval: true, dueAt: iso(OP_DAY, "08:00"), createdAt: iso(PLAN_DAY, "15:05") },
    { id: "a-5", surgicalCaseId: "c-3", requirementId: "r-c-3-3", title: "Book urgent cardiology re-assessment", description: "Cardiology clearance rejected due to abnormal ECG. Requires re-assessment before the case can proceed.", actionType: "lab_followup", priority: "high", status: "pending", ownerDepartment: "Cardiology", requiresApproval: false, dueAt: iso(OP_DAY, "09:00"), createdAt: iso(PLAN_DAY, "13:40") },
    { id: "a-6", surgicalCaseId: "c-6", requirementId: "r-c-6-4", title: "Follow up on pre-op bloodwork", description: "Pre-op bloodwork results pending; laboratory SLA exceeded by 4 hours.", actionType: "lab_followup", priority: "medium", status: "pending", ownerDepartment: "Laboratory", requiresApproval: false, dueAt: iso(OP_DAY, "12:00"), createdAt: iso(PLAN_DAY, "16:20") },
    { id: "a-7", surgicalCaseId: "c-10", requirementId: "r-c-10-2", title: "Confirm surgical consent signature", description: "Surgical consent awaiting patient signature. Confirm before admission.", actionType: "review_comms", priority: "medium", status: "pending", ownerDepartment: "Pre-Admissions", requiresApproval: false, dueAt: iso(OP_DAY, "09:30"), createdAt: iso(PLAN_DAY, "16:35") },
    // Completed (resolved ~3h after creation) — feeds Completed tab + resolution-time analytics
    { id: "a-8", surgicalCaseId: "c-1", requirementId: "r-c-1-4", title: "Verify pre-op fasting instructions sent", description: "Confirm fasting instructions were delivered and acknowledged by the patient.", actionType: "review_comms", priority: "medium", status: "completed", ownerDepartment: "Pre-Admissions", requiresApproval: false, dueAt: iso(PLAN_DAY, "18:00"), createdAt: iso(PLAN_DAY, "12:00"), completedAt: iso(PLAN_DAY, "14:45"), approvedBy: "u-1", approvedAt: iso(PLAN_DAY, "14:45") },
    // Overdue — feeds Overdue tab + notifications
    { id: "a-9", surgicalCaseId: "c-3", requirementId: "r-c-3-5", title: "Submit pre-authorization request", description: "Pre-authorization for the spinal fusion has not been submitted and is past its cut-off.", actionType: "lab_followup", priority: "high", status: "overdue", ownerDepartment: "Finance", requiresApproval: false, dueAt: iso(PLAN_DAY, "17:00"), createdAt: iso(PLAN_DAY, "11:00") },
  ]).run();

  // 8. Communications (bilingual draft awaiting approval)
  await db.insert(schema.communications).values([
    {
      id: "com-1", actionItemId: "a-4", surgicalCaseId: "c-2", language: "en/ar", recipientType: "patient",
      draftContent: JSON.stringify({
        en: "Hello, this is the pre-admission team at Burjeel Hospital regarding your procedure tomorrow. Please confirm you have stopped taking aspirin as instructed and have fasted from midnight. Reply YES to confirm.",
        ar: "مرحباً، هذا فريق ما قبل الإدخال في مستشفى برجيل بخصوص عمليتكم غداً. يرجى تأكيد توقفكم عن تناول الأسبرين حسب التعليمات والصيام من منتصف الليل. أجيبوا بنعم للتأكيد.",
      }),
      status: "draft",
    },
  ]).run();

  // 9. Evidence documents on CR-1051
  await db.insert(schema.evidenceDocuments).values([
    { id: "e-1", surgicalCaseId: "c-1051", requirementId: "r-c-1051-4", title: "Med-Path Labs Report", documentType: "PDF Scan", extractedText: "Patient S. Rahman — HbA1c 6.1%, Hb 13.2 g/dL, Platelets 240k", confidence: 92, synthetic: true, reviewStatus: "pending" },
    { id: "e-2", surgicalCaseId: "c-1051", requirementId: "r-c-1051-5", title: "Daman Authorization Screenshot", documentType: "Portal Capture", extractedText: "Authorization reference not found for MRN-1051-X on 12 Jul 2026.", confidence: 88, synthetic: true, reviewStatus: "pending" },
  ]).run();

  // 10. Endangered OR slot (freed by cancelled CR-1057)
  await db.insert(schema.operatingRoomSlots).values([
    { id: "slot-1", operatingRoomId: "or-3", originalCaseId: "c-1057", startTime: iso(OP_DAY, "11:45"), endTime: iso(OP_DAY, "13:00"), durationMinutes: 75, status: "endangered" },
  ]).run();

  // 11. Standby candidates — scored by the deterministic engine (no hand-tuned numbers)
  const slotDuration = 75;
  const candInputs: (CandidateInput & { patientId: string })[] = standby.map((c) => {
    const patient = ({ "p-12": { consent: true, avail: "confirmed" }, "p-13": { consent: true, avail: "confirmed" }, "p-14": { consent: true, avail: "confirmed" }, "p-15": { consent: true, avail: "pending" }, "p-16": { consent: false, avail: "confirmed" } } as Record<string, { consent: boolean; avail: string }>)[c.patientId];
    return {
      patientId: c.patientId,
      caseId: c.id,
      caseNumber: c.caseNumber,
      patientName: "",
      procedureName: c.procedureName,
      durationMinutes: c.durationMinutes,
      readinessScore: c.readiness,
      standbyConsent: patient.consent,
      availabilityStatus: patient.avail,
      teamCompatible: c.teamCompatible,
      equipmentAvailable: c.equipmentAvailable,
      bedAvailable: c.bedAvailable,
      hasHardBlockers: false,
    };
  });
  const evaluated = evaluateSlotCandidates(slotDuration, candInputs);
  await db.insert(schema.standbyCandidates).values(
    evaluated.map((r, i) => ({
      id: `cand-${i + 1}`, slotId: "slot-1", surgicalCaseId: r.caseId,
      durationScore: r.durationScore, teamScore: r.teamScore, equipmentScore: r.equipmentScore,
      readinessScore: r.readinessScore, availabilityScore: r.availabilityScore, overallScore: r.overallScore,
      eligible: r.eligible, failedConstraintsJson: JSON.stringify(r.failedConstraints), rankingReason: r.rankingReason,
    }))
  ).run();

  // 12. System settings
  await db.insert(schema.systemSettings).values([
    { id: "set-1", key: "hospital_name", valueJson: JSON.stringify("Burjeel Hospital, Abu Dhabi") },
    { id: "set-2", key: "warning_threshold", valueJson: JSON.stringify(90) },
    { id: "set-3", key: "critical_threshold", valueJson: JSON.stringify(60) },
    { id: "set-4", key: "default_language", valueJson: JSON.stringify("en") },
  ]).run();

  // 13. Audit events — varied historical record. Anchored to "now minus offset" so any
  // event created live during the demo sorts to the top of the (createdAt DESC) trail.
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const audit = [
    { h: 30, caseId: "c-1051", actor: null, actorType: "system_rule", event: "readiness_recalculated", entity: "surgical_case", entityId: "c-1051", reason: "Overnight readiness sweep flagged CR-1051 (insurance authorization missing).", approval: null },
    { h: 29.9, caseId: "c-3", actor: null, actorType: "system_rule", event: "readiness_recalculated", entity: "surgical_case", entityId: "c-3", reason: "Overnight readiness sweep flagged CR-1003 (cardiology clearance rejected).", approval: null },
    { h: 24, caseId: "c-1051", actor: "u-1", actorType: "user", event: "evidence_flagged", entity: "evidence_document", entityId: "e-2", reason: "Coordinator flagged the Daman authorization capture as a missing reference.", approval: "recorded" },
    { h: 20, caseId: "c-1051", actor: "u-2", actorType: "user", event: "requirement_updated", entity: "readiness_requirement", entityId: "r-c-1051-4", reason: "Clinical reviewer moved pre-op labs to clinical review (HbA1c protocol flag).", approval: "recorded" },
    { h: 12, caseId: "c-1", actor: "u-1", actorType: "user", event: "action_created", entity: "action_item", entityId: "a-8", reason: "Follow-up created: verify pre-op fasting instructions for CR-1001.", approval: null },
    { h: 9, caseId: "c-1", actor: "u-1", actorType: "user", event: "action_completed", entity: "action_item", entityId: "a-8", reason: "Fasting instructions confirmed delivered and acknowledged.", approval: "approved" },
    { h: 8, caseId: "c-2", actor: null, actorType: "system_rule", event: "communication_drafted", entity: "communication", entityId: "com-1", reason: "Bilingual pre-op confirmation drafted from template for CR-1002 (awaiting approval).", approval: "pending" },
    { h: 5, caseId: "c-1057", actor: "u-3", actorType: "user", event: "slot_flagged", entity: "operating_room_slot", entityId: "slot-1", reason: "OR 03 11:45 slot flagged endangered after CR-1057 cancellation (patient unavailable).", approval: null },
    { h: 3, caseId: "c-3", actor: null, actorType: "system_rule", event: "action_overdue", entity: "action_item", entityId: "a-9", reason: "Pre-authorization request for CR-1003 passed its cut-off and was marked overdue.", approval: null },
  ];
  await db.insert(schema.auditEvents).values(
    audit.map((a, i) => ({
      id: `au-seed-${i + 1}`, caseId: a.caseId,
      actorUserId: a.actor, actorType: a.actorType, eventType: a.event, entityType: a.entity, entityId: a.entityId,
      previousStateJson: null, newStateJson: null, reason: a.reason, approvalStatus: a.approval, createdAt: hoursAgo(a.h),
    }))
  ).run();
}
