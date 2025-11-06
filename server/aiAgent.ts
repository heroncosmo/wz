import { Mistral } from "@mistralai/mistralai";
import { storage } from "./storage";
import type { Message } from "@shared/schema";

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || "",
});

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

    const chatResponse = await mistral.chat.complete({
      model: agentConfig.model,
      messages: messages as any,
    });

    const responseText = chatResponse.choices?.[0]?.message?.content;
    return responseText || null;
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

    const chatResponse = await mistral.chat.complete({
      model: agentConfig.model,
      messages: messages as any,
    });

    const responseText = chatResponse.choices?.[0]?.message?.content;
    return responseText || null;
  } catch (error) {
    console.error("Error testing agent:", error);
    throw error;
  }
}
