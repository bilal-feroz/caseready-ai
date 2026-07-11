import { seedDatabase } from "../src/lib/seed.ts";

async function main() {
  console.log("Seeding database...");
  await seedDatabase();
  console.log("Seeding completed successfully.");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
