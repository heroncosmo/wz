import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");
    
    const migrationFile = path.join(process.cwd(), "migrations", "add_media_support.sql");
    const migrationSQL = fs.readFileSync(migrationFile, "utf-8");
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
    }
    
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
