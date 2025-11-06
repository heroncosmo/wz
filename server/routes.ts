import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  sendMessage as whatsappSendMessage,
  addWebSocketClient,
} from "./whatsapp";
import { sendMessageSchema, insertAiAgentConfigSchema } from "@shared/schema";
import { testAgentResponse } from "./aiAgent";
import { z } from "zod";

// Helper to get userId from authenticated request
function getUserId(req: any): string {
  return req.user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // WhatsApp connection routes
  app.get("/api/whatsapp/connection", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const connection = await storage.getConnectionByUserId(userId);
      
      if (!connection) {
        return res.json(null);
      }

      res.json(connection);
    } catch (error) {
      console.error("Error fetching connection:", error);
      res.status(500).json({ message: "Failed to fetch connection" });
    }
  });

  app.post("/api/whatsapp/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await connectWhatsApp(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error connecting WhatsApp:", error);
      res.status(500).json({ message: "Failed to connect WhatsApp" });
    }
  });

  app.post("/api/whatsapp/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await disconnectWhatsApp(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting WhatsApp:", error);
      res.status(500).json({ message: "Failed to disconnect WhatsApp" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);

      // Get user's connection
      const connection = await storage.getConnectionByUserId(userId);
      if (!connection) {
        return res.json([]);
      }

      const conversations = await storage.getConversationsByConnectionId(connection.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversation/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
      const conversation = await storage.getConversation(id);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Verify ownership through connection
      const connection = await storage.getConnectionByUserId(userId);
      if (!connection || conversation.connectionId !== connection.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Message routes
  app.get("/api/messages/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = getUserId(req);

      // Verify ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const connection = await storage.getConnectionByUserId(userId);
      if (!connection || conversation.connectionId !== connection.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = sendMessageSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid request", errors: result.error });
      }

      const { conversationId, text } = result.data;

      // Verify ownership before sending
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const connection = await storage.getConnectionByUserId(userId);
      if (!connection || conversation.connectionId !== connection.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await whatsappSendMessage(userId, conversationId, text);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: error.message || "Failed to send message" });
    }
  });

  // Stats route
  app.get("/api/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const connection = await storage.getConnectionByUserId(userId);

      if (!connection) {
        return res.json({
          totalConversations: 0,
          unreadMessages: 0,
          todayMessages: 0,
        });
      }

      const conversations = await storage.getConversationsByConnectionId(connection.id);
      const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      const todayMessages = await storage.getTodayMessagesCount(connection.id);

      res.json({
        totalConversations: conversations.length,
        unreadMessages,
        todayMessages,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // AI Agent routes
  app.get("/api/agent/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const config = await storage.getAgentConfig(userId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching agent config:", error);
      res.status(500).json({ message: "Failed to fetch agent config" });
    }
  });

  app.post("/api/agent/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const result = insertAiAgentConfigSchema.partial().safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid request", errors: result.error });
      }

      const config = await storage.upsertAgentConfig(userId, result.data);
      res.json(config);
    } catch (error) {
      console.error("Error updating agent config:", error);
      res.status(500).json({ message: "Failed to update agent config" });
    }
  });

  app.post("/api/agent/test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const schema = z.object({ message: z.string() });
      const result = schema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const response = await testAgentResponse(userId, result.data.message);
      res.json({ response });
    } catch (error: any) {
      console.error("Error testing agent:", error);
      res.status(500).json({ message: error.message || "Failed to test agent" });
    }
  });

  app.post("/api/agent/disable/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = getUserId(req);

      // Verify ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const connection = await storage.getConnectionByUserId(userId);
      if (!connection || conversation.connectionId !== connection.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.disableAgentForConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disabling agent:", error);
      res.status(500).json({ message: "Failed to disable agent" });
    }
  });

  app.post("/api/agent/enable/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const { conversationId } = req.params;
      const userId = getUserId(req);

      // Verify ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const connection = await storage.getConnectionByUserId(userId);
      if (!connection || conversation.connectionId !== connection.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.enableAgentForConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error enabling agent:", error);
      res.status(500).json({ message: "Failed to enable agent" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ 
    noServer: true
  });

  // Handle WebSocket upgrade with session support
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }

    // Process session middleware for WebSocket upgrade
    const session = getSession();
    const req = request as any;
    const res = {} as any;
    
    session(req, res, () => {
      if (!req.session || !req.session.passport || !req.session.passport.user) {
        console.error("WebSocket upgrade failed: no authenticated session");
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
  });

  wss.on("connection", (ws: WebSocket, req: any) => {
    try {
      // Get userId from session
      const userId = req.session?.passport?.user?.claims?.sub;
      
      if (!userId) {
        console.error("WebSocket connection without valid user ID");
        ws.close(1008, "Unauthorized");
        return;
      }

      console.log(`WebSocket client connected for user: ${userId}`);
      addWebSocketClient(ws as any, userId);

      ws.on("close", () => {
        console.log(`WebSocket client disconnected for user: ${userId}`);
      });
    } catch (error) {
      console.error("Error handling WebSocket connection:", error);
      ws.close(1011, "Internal server error");
    }
  });

  return httpServer;
}
