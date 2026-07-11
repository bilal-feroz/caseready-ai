// Idempotent schema DDL (generated from src/db/schema.ts via drizzle-kit, with IF NOT EXISTS
// added). Applied at runtime so a fresh database — e.g. an empty Turso instance on first
// deploy — provisions itself without needing the drizzle-kit CLI in the serverless runtime.
export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS \`operating_rooms\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`code\` text NOT NULL,
	\`name\` text NOT NULL,
	\`capabilities_json\` text NOT NULL,
	\`active\` integer DEFAULT true NOT NULL
);
CREATE TABLE IF NOT EXISTS \`surgeons\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`full_name\` text NOT NULL,
	\`specialty\` text NOT NULL
);
CREATE TABLE IF NOT EXISTS \`patients\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`synthetic_patient_id\` text NOT NULL,
	\`masked_name\` text NOT NULL,
	\`preferred_language\` text DEFAULT 'en' NOT NULL,
	\`standby_consent\` integer DEFAULT false NOT NULL,
	\`availability_status\` text DEFAULT 'confirmed' NOT NULL,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`users\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`email\` text NOT NULL,
	\`password_hash\` text NOT NULL,
	\`full_name\` text NOT NULL,
	\`role\` text NOT NULL,
	\`department\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`surgical_cases\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`case_number\` text NOT NULL,
	\`patient_id\` text NOT NULL,
	\`surgeon_id\` text NOT NULL,
	\`operating_room_id\` text NOT NULL,
	\`procedure_name\` text NOT NULL,
	\`procedure_category\` text NOT NULL,
	\`scheduled_start\` text NOT NULL,
	\`scheduled_end\` text NOT NULL,
	\`duration_minutes\` integer NOT NULL,
	\`readiness_score\` integer DEFAULT 0 NOT NULL,
	\`readiness_status\` text DEFAULT 'at_risk' NOT NULL,
	\`case_status\` text DEFAULT 'scheduled' NOT NULL,
	\`cancellation_reason\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	\`updated_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`readiness_requirements\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`surgical_case_id\` text NOT NULL,
	\`category\` text NOT NULL,
	\`requirement_type\` text NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL,
	\`severity\` text DEFAULT 'medium' NOT NULL,
	\`owner_department\` text NOT NULL,
	\`source_reference\` text,
	\`due_at\` text,
	\`notes\` text,
	\`last_checked_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`evidence_documents\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`surgical_case_id\` text NOT NULL,
	\`requirement_id\` text NOT NULL,
	\`title\` text NOT NULL,
	\`document_type\` text NOT NULL,
	\`extracted_text\` text NOT NULL,
	\`confidence\` integer NOT NULL,
	\`synthetic\` integer DEFAULT true NOT NULL,
	\`review_status\` text DEFAULT 'pending' NOT NULL,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`action_items\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`surgical_case_id\` text NOT NULL,
	\`requirement_id\` text NOT NULL,
	\`title\` text NOT NULL,
	\`description\` text NOT NULL,
	\`action_type\` text NOT NULL,
	\`priority\` text DEFAULT 'medium' NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL,
	\`owner_department\` text NOT NULL,
	\`due_at\` text,
	\`requires_approval\` integer DEFAULT false NOT NULL,
	\`approved_by\` text,
	\`approved_at\` text,
	\`completed_at\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	\`updated_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`communications\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`action_item_id\` text NOT NULL,
	\`surgical_case_id\` text NOT NULL,
	\`language\` text DEFAULT 'en' NOT NULL,
	\`recipient_type\` text NOT NULL,
	\`draft_content\` text NOT NULL,
	\`final_content\` text,
	\`status\` text DEFAULT 'draft' NOT NULL,
	\`approved_by\` text,
	\`approved_at\` text,
	\`sent_at\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`operating_room_slots\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`operating_room_id\` text NOT NULL,
	\`original_case_id\` text NOT NULL,
	\`start_time\` text NOT NULL,
	\`end_time\` text NOT NULL,
	\`duration_minutes\` integer NOT NULL,
	\`status\` text DEFAULT 'endangered' NOT NULL
);
CREATE TABLE IF NOT EXISTS \`standby_candidates\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`slot_id\` text NOT NULL,
	\`surgical_case_id\` text NOT NULL,
	\`duration_score\` integer NOT NULL,
	\`team_score\` integer NOT NULL,
	\`equipment_score\` integer NOT NULL,
	\`readiness_score\` integer NOT NULL,
	\`availability_score\` integer NOT NULL,
	\`overall_score\` integer NOT NULL,
	\`eligible\` integer NOT NULL,
	\`failed_constraints_json\` text NOT NULL,
	\`ranking_reason\` text NOT NULL
);
CREATE TABLE IF NOT EXISTS \`replacement_proposals\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`slot_id\` text NOT NULL,
	\`original_case_id\` text NOT NULL,
	\`proposed_case_id\` text NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL,
	\`proposed_by\` text NOT NULL,
	\`approved_by\` text,
	\`rejection_reason\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	\`updated_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`audit_events\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`case_id\` text,
	\`actor_user_id\` text,
	\`actor_type\` text NOT NULL,
	\`event_type\` text NOT NULL,
	\`entity_type\` text NOT NULL,
	\`entity_id\` text NOT NULL,
	\`previous_state_json\` text,
	\`new_state_json\` text,
	\`reason\` text,
	\`approval_status\` text,
	\`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS \`system_settings\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`key\` text NOT NULL,
	\`value_json\` text NOT NULL,
	\`updated_by\` text,
	\`updated_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS \`operating_rooms_code_unique\` ON \`operating_rooms\` (\`code\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`patients_synthetic_patient_id_unique\` ON \`patients\` (\`synthetic_patient_id\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`surgical_cases_case_number_unique\` ON \`surgical_cases\` (\`case_number\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`system_settings_key_unique\` ON \`system_settings\` (\`key\`);
CREATE UNIQUE INDEX IF NOT EXISTS \`users_email_unique\` ON \`users\` (\`email\`);
`;
