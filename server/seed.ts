import { db } from "./db";
import { admins, systemConfig, plans, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");

    const adminEmail = "rodrigoconexao128@gmail.com";
    const adminPassword = "Ibira2019!";

    const existingAdmin = await db
      .select()
      .from(admins)
      .where(eq(admins.email, adminEmail))
      .limit(1);

    if (existingAdmin.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await db.insert(admins).values({
        email: adminEmail,
        passwordHash,
        role: "owner",
      });
      console.log("✅ Admin owner created:", adminEmail);
    } else {
      console.log("ℹ️ Admin owner already exists");
    }

    const mistralKeyConfig = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.chave, "mistral_api_key"))
      .limit(1);

    if (mistralKeyConfig.length === 0) {
      await db.insert(systemConfig).values({
        chave: "mistral_api_key",
        valor: "9rYWr97uytmbYIkXRJXK5Kqx73qPHDxe",
      });
      console.log("✅ Mistral API Key configured");
    } else {
      console.log("ℹ️ Mistral API Key already exists");
    }

    // Seed PIX key
    const pixKeyConfig = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.chave, "pix_key"))
      .limit(1);

    if (pixKeyConfig.length === 0) {
      await db.insert(systemConfig).values({
        chave: "pix_key",
        valor: "rodrigoconexao128@gmail.com",
      });
      console.log("✅ PIX key configured");
    } else {
      console.log("ℹ️ PIX key already exists");
    }

    // Seed default plans
    const existingPlans = await db.select().from(plans).limit(1);
    if (existingPlans.length === 0) {
      await db.insert(plans).values([
        {
          nome: "Pro",
          valor: "299.90",
          periodicidade: "mensal",
          limiteConversas: -1,
          limiteAgentes: -1,
          ativo: true,
        },
      ]);
      console.log("✅ Default plan Pro created");
    } else {
      console.log("ℹ️ Plans already exist");
    }

    // Ensure admin owner user exists in users table (for Replit Auth integration)
    const adminUser = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (adminUser.length === 0) {
      await db.insert(users).values({
        email: adminEmail,
        role: "owner",
        name: "Rodrigo Admin",
        phone: "",
        onboardingCompleted: true,
      });
      console.log("✅ Admin user created in users table");
    } else {
      // Update role to owner if exists
      await db.update(users).set({ role: "owner" }).where(eq(users.email, adminEmail));
      console.log("ℹ️ Admin user role updated to owner");
    }

    console.log("🎉 Database seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}
