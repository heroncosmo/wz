import {
  users,
  whatsappConnections,
  conversations,
  messages,
  aiAgentConfig,
  agentDisabledConversations,
  type User,
  type UpsertUser,
  type WhatsappConnection,
  type InsertWhatsappConnection,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type AiAgentConfig,
  type InsertAiAgentConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // WhatsApp connection operations
  getConnectionByUserId(userId: string): Promise<WhatsappConnection | undefined>;
  createConnection(connection: InsertWhatsappConnection): Promise<WhatsappConnection>;
  updateConnection(id: string, data: Partial<InsertWhatsappConnection>): Promise<WhatsappConnection>;

  // Conversation operations
  getConversationsByConnectionId(connectionId: string): Promise<Conversation[]>;
  getConversationByContactNumber(connectionId: string, contactNumber: string): Promise<Conversation | undefined>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation>;

  // Message operations
  getMessagesByConversationId(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  getTodayMessagesCount(connectionId: string): Promise<number>;
  getAgentMessagesCount(connectionId: string): Promise<number>;

  // AI Agent operations
  getAgentConfig(userId: string): Promise<AiAgentConfig | undefined>;
  upsertAgentConfig(userId: string, data: Partial<InsertAiAgentConfig>): Promise<AiAgentConfig>;
  isAgentDisabledForConversation(conversationId: string): Promise<boolean>;
  disableAgentForConversation(conversationId: string): Promise<void>;
  enableAgentForConversation(conversationId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // WhatsApp connection operations
  async getConnectionByUserId(userId: string): Promise<WhatsappConnection | undefined> {
    const [connection] = await db
      .select()
      .from(whatsappConnections)
      .where(eq(whatsappConnections.userId, userId))
      .orderBy(desc(whatsappConnections.createdAt))
      .limit(1);
    return connection;
  }

  async createConnection(connectionData: InsertWhatsappConnection): Promise<WhatsappConnection> {
    const [connection] = await db
      .insert(whatsappConnections)
      .values(connectionData)
      .returning();
    return connection;
  }

  async updateConnection(id: string, data: Partial<InsertWhatsappConnection>): Promise<WhatsappConnection> {
    const [connection] = await db
      .update(whatsappConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whatsappConnections.id, id))
      .returning();
    return connection;
  }

  // Conversation operations
  async getConversationsByConnectionId(connectionId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.connectionId, connectionId))
      .orderBy(desc(conversations.lastMessageTime));
  }

  async getConversationByContactNumber(
    connectionId: string,
    contactNumber: string
  ): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.connectionId, connectionId),
          eq(conversations.contactNumber, contactNumber)
        )
      );
    return conversation;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return conversation;
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation> {
    const [conversation] = await db
      .update(conversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return conversation;
  }

  // Message operations
  async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getTodayMessagesCount(connectionId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.connectionId, connectionId),
          gte(messages.timestamp, today)
        )
      );

    return result.length;
  }

  async getAgentMessagesCount(connectionId: string): Promise<number> {
    const result = await db
      .select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          eq(conversations.connectionId, connectionId),
          eq(messages.isFromAgent, true)
        )
      );

    return result.length;
  }

  // AI Agent operations
  async getAgentConfig(userId: string): Promise<AiAgentConfig | undefined> {
    const [config] = await db
      .select()
      .from(aiAgentConfig)
      .where(eq(aiAgentConfig.userId, userId));
    return config;
  }

  async upsertAgentConfig(userId: string, data: Partial<InsertAiAgentConfig>): Promise<AiAgentConfig> {
    const [config] = await db
      .insert(aiAgentConfig)
      .values({ userId, ...data } as InsertAiAgentConfig)
      .onConflictDoUpdate({
        target: aiAgentConfig.userId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    return config;
  }

  async isAgentDisabledForConversation(conversationId: string): Promise<boolean> {
    const [disabled] = await db
      .select()
      .from(agentDisabledConversations)
      .where(eq(agentDisabledConversations.conversationId, conversationId));
    return !!disabled;
  }

  async disableAgentForConversation(conversationId: string): Promise<void> {
    await db
      .insert(agentDisabledConversations)
      .values({ conversationId })
      .onConflictDoNothing();
  }

  async enableAgentForConversation(conversationId: string): Promise<void> {
    await db
      .delete(agentDisabledConversations)
      .where(eq(agentDisabledConversations.conversationId, conversationId));
  }
}

export const storage = new DatabaseStorage();
