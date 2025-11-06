import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (IMPORTANT: mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (IMPORTANT: mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp connections table
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  phoneNumber: varchar("phone_number"),
  isConnected: boolean("is_connected").default(false).notNull(),
  qrCode: text("qr_code"),
  sessionData: jsonb("session_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull().references(() => whatsappConnections.id, { onDelete: 'cascade' }),
  contactNumber: varchar("contact_number").notNull(),
  contactName: varchar("contact_name"),
  lastMessageText: text("last_message_text"),
  lastMessageTime: timestamp("last_message_time"),
  unreadCount: integer("unread_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: varchar("message_id").notNull(),
  fromMe: boolean("from_me").notNull(),
  text: text("text"),
  timestamp: timestamp("timestamp").notNull(),
  status: varchar("status", { length: 50 }),
  isFromAgent: boolean("is_from_agent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Agent Configuration table
export const aiAgentConfig = pgTable("ai_agent_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  prompt: text("prompt").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  model: varchar("model", { length: 100 }).default("mistral-small-latest").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Agent disabled conversations table
export const agentDisabledConversations = pgTable("agent_disabled_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().unique().references(() => conversations.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  whatsappConnections: many(whatsappConnections),
  aiAgentConfig: one(aiAgentConfig, {
    fields: [users.id],
    references: [aiAgentConfig.userId],
  }),
}));

export const whatsappConnectionsRelations = relations(whatsappConnections, ({ one, many }) => ({
  user: one(users, {
    fields: [whatsappConnections.userId],
    references: [users.id],
  }),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  connection: one(whatsappConnections, {
    fields: [conversations.connectionId],
    references: [whatsappConnections.id],
  }),
  messages: many(messages),
  agentDisabled: one(agentDisabledConversations, {
    fields: [conversations.id],
    references: [agentDisabledConversations.conversationId],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Zod schemas and types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;
export type WhatsappConnection = typeof whatsappConnections.$inferSelect;

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export const sendMessageSchema = z.object({
  conversationId: z.string(),
  text: z.string().min(1, "Message cannot be empty"),
});
export type SendMessage = z.infer<typeof sendMessageSchema>;

export const insertAiAgentConfigSchema = createInsertSchema(aiAgentConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiAgentConfig = z.infer<typeof insertAiAgentConfigSchema>;
export type AiAgentConfig = typeof aiAgentConfig.$inferSelect;

export const insertAgentDisabledConversationSchema = createInsertSchema(agentDisabledConversations).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentDisabledConversation = z.infer<typeof insertAgentDisabledConversationSchema>;
export type AgentDisabledConversation = typeof agentDisabledConversations.$inferSelect;
