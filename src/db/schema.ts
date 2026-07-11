import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export type RequirementStatus =
  | "completed"
  | "pending"
  | "missing"
  | "overdue"
  | "blocked"
  | "clinical_review"
  | "not_applicable";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // coordinator, clinical_reviewer, scheduling_officer, administrator
  department: text("department"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  syntheticPatientId: text("synthetic_patient_id").notNull().unique(), // MRN or similar
  maskedName: text("masked_name").notNull(),
  preferredLanguage: text("preferred_language").default("en").notNull(),
  standbyConsent: integer("standby_consent", { mode: "boolean" }).default(false).notNull(),
  availabilityStatus: text("availability_status").default("confirmed").notNull(), // confirmed, pending, unavailable
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const surgeons = sqliteTable("surgeons", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  specialty: text("specialty").notNull(),
});

export const operatingRooms = sqliteTable("operating_rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // OR 01, OR 02, etc.
  name: text("name").notNull(),
  capabilitiesJson: text("capabilities_json").notNull(), // JSON string list of capabilities
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
});

export const surgicalCases = sqliteTable("surgical_cases", {
  id: text("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(), // CR-1051, etc.
  patientId: text("patient_id").references(() => patients.id).notNull(),
  surgeonId: text("surgeon_id").references(() => surgeons.id).notNull(),
  operatingRoomId: text("operating_room_id").references(() => operatingRooms.id).notNull(),
  procedureName: text("procedure_name").notNull(),
  procedureCategory: text("procedure_category").notNull(),
  scheduledStart: text("scheduled_start").notNull(), // ISO datetime string
  scheduledEnd: text("scheduled_end").notNull(), // ISO datetime string
  durationMinutes: integer("duration_minutes").notNull(),
  readinessScore: integer("readiness_score").default(0).notNull(),
  readinessStatus: text("readiness_status").default("at_risk").notNull(), // ready, at_risk, blocked
  caseStatus: text("case_status").default("scheduled").notNull(), // scheduled, completed, cancelled, pending_reschedule
  cancellationReason: text("cancellation_reason"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const readinessRequirements = sqliteTable("readiness_requirements", {
  id: text("id").primaryKey(),
  surgicalCaseId: text("surgical_case_id").references(() => surgicalCases.id).notNull(),
  category: text("category").notNull(), // patient_prep, clinical_clearance, operational_logistical
  requirementType: text("requirement_type").notNull(), // identity_confirmed, surgical_consent, anaesthesia_review, pre_op_labs, insurance_authorization, etc.
  status: text("status").default("pending").notNull(), // completed, pending, missing, overdue, blocked, clinical_review, not_applicable
  severity: text("severity").default("medium").notNull(), // critical, medium, low
  ownerDepartment: text("owner_department").notNull(), // Admin, Clinical Review, Finance, Lab, etc.
  sourceReference: text("source_reference"),
  dueAt: text("due_at"), // ISO datetime string
  notes: text("notes"),
  lastCheckedAt: text("last_checked_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const evidenceDocuments = sqliteTable("evidence_documents", {
  id: text("id").primaryKey(),
  surgicalCaseId: text("surgical_case_id").references(() => surgicalCases.id).notNull(),
  requirementId: text("requirement_id").references(() => readinessRequirements.id).notNull(),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  extractedText: text("extracted_text").notNull(),
  confidence: integer("confidence").notNull(), // percentage e.g. 92
  synthetic: integer("synthetic", { mode: "boolean" }).default(true).notNull(),
  reviewStatus: text("review_status").default("pending").notNull(), // pending, acknowledged, flagged_incorrect
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const actionItems = sqliteTable("action_items", {
  id: text("id").primaryKey(),
  surgicalCaseId: text("surgical_case_id").references(() => surgicalCases.id).notNull(),
  requirementId: text("requirement_id").references(() => readinessRequirements.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  actionType: text("action_type").notNull(), // review_comms, verify_implant, approve_consent, lab_followup, etc.
  priority: text("priority").default("medium").notNull(), // high, medium, low
  status: text("status").default("pending").notNull(), // pending, completed, overdue
  ownerDepartment: text("owner_department").notNull(),
  dueAt: text("due_at"),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).default(false).notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const communications = sqliteTable("communications", {
  id: text("id").primaryKey(),
  actionItemId: text("action_item_id").references(() => actionItems.id).notNull(),
  surgicalCaseId: text("surgical_case_id").references(() => surgicalCases.id).notNull(),
  language: text("language").default("en").notNull(), // en, ar, etc.
  recipientType: text("recipient_type").notNull(), // patient, provider, payer
  draftContent: text("draft_content").notNull(),
  finalContent: text("final_content"),
  status: text("status").default("draft").notNull(), // draft, sent, failed
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: text("approved_at"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const operatingRoomSlots = sqliteTable("operating_room_slots", {
  id: text("id").primaryKey(),
  operatingRoomId: text("operating_room_id").references(() => operatingRooms.id).notNull(),
  originalCaseId: text("original_case_id").references(() => surgicalCases.id).notNull(),
  startTime: text("start_time").notNull(), // ISO datetime string
  endTime: text("end_time").notNull(), // ISO datetime string
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status").default("endangered").notNull(), // endangered, rescued, cancelled
});

export const standbyCandidates = sqliteTable("standby_candidates", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").references(() => operatingRoomSlots.id).notNull(),
  surgicalCaseId: text("surgical_case_id").references(() => surgicalCases.id).notNull(),
  durationScore: integer("duration_score").notNull(),
  teamScore: integer("team_score").notNull(),
  equipmentScore: integer("equipment_score").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  availabilityScore: integer("availability_score").notNull(),
  overallScore: integer("overall_score").notNull(),
  eligible: integer("eligible", { mode: "boolean" }).notNull(),
  failedConstraintsJson: text("failed_constraints_json").notNull(), // JSON list of failed checks
  rankingReason: text("ranking_reason").notNull(),
});

export const replacementProposals = sqliteTable("replacement_proposals", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").references(() => operatingRoomSlots.id).notNull(),
  originalCaseId: text("original_case_id").references(() => surgicalCases.id).notNull(),
  proposedCaseId: text("proposed_case_id").references(() => surgicalCases.id).notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  proposedBy: text("proposed_by").references(() => users.id).notNull(),
  approvedBy: text("approved_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id").references(() => surgicalCases.id),
  actorUserId: text("actor_user_id").references(() => users.id),
  actorType: text("actor_type").notNull(), // system_rule, user, api
  eventType: text("event_type").notNull(), // e.g. communication_sent, evidence_acknowledged, proposal_created, proposal_approved, status_recalculated
  entityType: text("entity_type").notNull(), // e.g. communication, evidence_document, replacement_proposal
  entityId: text("entity_id").notNull(),
  previousStateJson: text("previous_state_json"),
  newStateJson: text("new_state_json"),
  reason: text("reason"),
  approvalStatus: text("approval_status"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const systemSettings = sqliteTable("system_settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueJson: text("value_json").notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
