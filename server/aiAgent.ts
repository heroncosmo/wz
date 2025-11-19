import { Mistral } from "@mistralai/mistralai";
import { storage } from "./storage";
import type { Message } from "@shared/schema";
import { db } from "./db";
import { systemConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

async function getMistralClient(): Promise<Mistral> {
  try {
    const config = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.chave, "mistral_api_key"))
      .limit(1);

    const apiKey = config[0]?.valor || process.env.MISTRAL_API_KEY || "";
    
    if (!apiKey) {
      throw new Error("Mistral API Key not configured");
    }

    return new Mistral({ apiKey });
  } catch (error) {
    console.error("Error getting Mistral client:", error);
    throw error;
  }
}

export async function generateAIResponse(
  userId: string,
  conversationHistory: Message[],
  newMessageText: string
): Promise<string | null> {
  try {
    const agentConfig = await storage.getAgentConfig(userId);

    if (!agentConfig || !agentConfig.isActive) {
      return null;
    }

    // Validação de trigger phrases: se configuradas, verifica se alguma aparece na conversa
    if (agentConfig.triggerPhrases && agentConfig.triggerPhrases.length > 0) {
      // Concatena todas as mensagens da conversa (histórico + nova mensagem)
      const allMessages = [
        ...conversationHistory.map(m => m.text || ""),
        newMessageText
      ].join(" ").toLowerCase();

      // Verifica se alguma trigger phrase está presente
      const hasTrigger = agentConfig.triggerPhrases.some(phrase => 
        allMessages.includes(phrase.toLowerCase())
      );

      if (!hasTrigger) {
        console.log(`[AI Agent] Skipping response - no trigger phrase found for user ${userId}`);
        return null;
      }

      console.log(`[AI Agent] Trigger phrase detected for user ${userId}, proceeding with response`);
    }

    const messages: Array<{ role: string; content: string }> = [
      {
        role: "system",
        content: agentConfig.prompt,
      },
    ];

    conversationHistory.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.fromMe ? "assistant" : "user",
        content: msg.text || "",
      });
    });

    messages.push({
      role: "user",
      content: newMessageText,
    });

    const mistral = await getMistralClient();
    const chatResponse = await mistral.chat.complete({
      model: agentConfig.model,
      messages: messages as any,
    });

    const content = chatResponse.choices?.[0]?.message?.content;
    const responseText = typeof content === 'string' ? content : null;
    return responseText;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return null;
  }
}

export async function testAgentResponse(
  userId: string,
  testMessage: string
): Promise<string | null> {
  try {
    const agentConfig = await storage.getAgentConfig(userId);

    if (!agentConfig) {
      throw new Error("Agent not configured");
    }

    const messages = [
      {
        role: "system",
        content: agentConfig.prompt,
      },
      {
        role: "user",
        content: testMessage,
      },
    ];

    const mistral = await getMistralClient();
    const chatResponse = await mistral.chat.complete({
      model: agentConfig.model,
      messages: messages as any,
    });

    const content = chatResponse.choices?.[0]?.message?.content;
    const responseText = typeof content === 'string' ? content : null;
    return responseText;
  } catch (error) {
    console.error("Error testing agent:", error);
    throw error;
  }
}
