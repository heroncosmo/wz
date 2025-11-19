// Script para corrigir números de telefone no banco de dados
// Execute com: node fix-contact-numbers.js

import { db } from "./server/db";
import { conversations } from "./shared/schema";
import { sql } from "drizzle-orm";

async function fixContactNumbers() {
  try {
    console.log("🔧 Iniciando correção de números de telefone...");
    
    // Atualiza todos os números que contêm ":"
    const result = await db.execute(sql`
      UPDATE conversations
      SET contact_number = split_part(contact_number, ':', 1)
      WHERE contact_number LIKE '%:%'
      RETURNING id, contact_number
    `);
    
    console.log(`✅ Corrigidos ${result.rowCount} número(s) de telefone!`);
    console.log("Números corrigidos:", result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao corrigir números:", error);
    process.exit(1);
  }
}

fixContactNumbers();
