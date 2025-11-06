import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import { isAdmin } from "./middleware";
import {
  connectWhatsApp,
  disconnectWhatsApp,
  sendMessage as whatsappSendMessage,
  addWebSocketClient,
} from "./whatsapp";
import { 
  sendMessageSchema, 
  insertAiAgentConfigSchema,
  insertPlanSchema,
  insertSubscriptionSchema,
  insertPaymentSchema,
} from "@shared/schema";
import { testAgentResponse } from "./aiAgent";
import { generatePixQRCode } from "./pixService";
import { z } from "zod";

// Helper to get userId from authenticated request
function getUserId(req: any): string {
  return req.user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // ==================== ADMIN AUTH ROUTES ====================
  // Admin login with email/password
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const bcrypt = await import("bcryptjs");
      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store admin session
      (req.session as any).adminId = admin.id;
      (req.session as any).adminRole = admin.role;

      res.json({ 
        success: true,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
        }
      });
    } catch (error) {
      console.error("Error in admin login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Check admin session
  app.get("/api/admin/session", (req, res) => {
    const adminId = (req.session as any)?.adminId;
    const adminRole = (req.session as any)?.adminRole;
    
    if (adminId) {
      res.json({ 
        authenticated: true,
        adminId,
        role: adminRole,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", (req, res) => {
    delete (req.session as any).adminId;
    delete (req.session as any).adminRole;
    res.json({ success: true });
  });

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
          agentMessages: 0,
        });
      }

      const conversations = await storage.getConversationsByConnectionId(connection.id);
      const unreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      const todayMessages = await storage.getTodayMessagesCount(connection.id);
      const agentMessages = await storage.getAgentMessagesCount(connection.id);

      res.json({
        totalConversations: conversations.length,
        unreadMessages,
        todayMessages,
        agentMessages,
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

  // ==================== PLANOS ROUTES ====================
  // Get all active plans (public)
  app.get("/api/plans", async (_req, res) => {
    try {
      const plans = await storage.getActivePlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Get all plans (admin only)
  app.get("/api/admin/plans", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const plans = await storage.getAllPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Create plan (admin only)
  app.post("/api/admin/plans", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(validatedData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  // Update plan (admin only)
  app.put("/api/admin/plans/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(id, validatedData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  // Delete plan (admin only)
  app.delete("/api/admin/plans/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePlan(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // ==================== SUBSCRIPTIONS ROUTES ====================
  // Get current user subscription
  app.get("/api/subscriptions/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const subscription = await storage.getUserSubscription(userId);
      res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Create subscription
  app.post("/api/subscriptions/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      // Check if plan exists and is active
      const plan = await storage.getPlan(planId);
      if (!plan || !plan.ativo) {
        return res.status(404).json({ message: "Plan not found or inactive" });
      }

      // Create subscription with pending status
      const subscription = await storage.createSubscription({
        userId,
        planId,
        status: "pending",
        dataInicio: new Date(),
      });

      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  // Get all subscriptions (admin only)
  app.get("/api/admin/subscriptions", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // ==================== PAYMENTS ROUTES ====================
  // Generate PIX QR Code
  app.post("/api/payments/generate-pix", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ message: "Subscription ID is required" });
      }

      // Get subscription with plan
      const subscription = await storage.getUserSubscription(userId);
      if (!subscription || subscription.id !== subscriptionId) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      // Check if payment already exists
      const existingPayment = await storage.getPaymentBySubscriptionId(subscriptionId);
      if (existingPayment && existingPayment.status === "pending") {
        return res.json(existingPayment);
      }

      // Generate PIX QR Code
      const { pixCode, pixQrCode } = await generatePixQRCode({
        planNome: subscription.plan.nome,
        valor: Number(subscription.plan.valor),
        subscriptionId,
      });

      // Create payment record
      const payment = await storage.createPayment({
        subscriptionId,
        valor: subscription.plan.valor,
        metodoPagamento: "pix",
        status: "pending",
        pixCode,
        pixQrCode,
      });

      res.json(payment);
    } catch (error) {
      console.error("Error generating PIX:", error);
      res.status(500).json({ message: "Failed to generate PIX" });
    }
  });

  // Get pending payments (admin only)
  app.get("/api/admin/payments/pending", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const payments = await storage.getPendingPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });

  // Approve payment (admin only)
  app.post("/api/admin/payments/approve/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Get payment
      const payment = await storage.getPayment(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      if (payment.status !== "pending") {
        return res.status(400).json({ message: "Payment already processed" });
      }

      // Update payment status
      await storage.updatePayment(id, {
        status: "paid",
        dataPagamento: new Date(),
      });

      // Activate subscription
      const subscription = await storage.getUserSubscription(payment.subscriptionId);
      if (subscription) {
        const now = new Date();
        const dataFim = new Date(now);
        
        // Add subscription period based on plan
        if (subscription.plan.periodicidade === "mensal") {
          dataFim.setMonth(dataFim.getMonth() + 1);
        } else if (subscription.plan.periodicidade === "anual") {
          dataFim.setFullYear(dataFim.getFullYear() + 1);
        }

        await storage.updateSubscription(subscription.id, {
          status: "active",
          dataInicio: now,
          dataFim,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error approving payment:", error);
      res.status(500).json({ message: "Failed to approve payment" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  // Get all users
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get admin stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const [users, totalRevenue, activeSubscriptions] = await Promise.all([
        storage.getAllUsers(),
        storage.getTotalRevenue(),
        storage.getActiveSubscriptionsCount(),
      ]);

      res.json({
        totalUsers: users.length,
        totalRevenue,
        activeSubscriptions,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get system config
  app.get("/api/admin/config", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const mistralKey = await storage.getSystemConfig("mistral_api_key");
      res.json({
        mistral_api_key: mistralKey?.valor || "",
      });
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({ message: "Failed to fetch config" });
    }
  });

  // Update system config
  app.put("/api/admin/config", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { mistral_api_key } = req.body;

      if (mistral_api_key !== undefined) {
        await storage.updateSystemConfig("mistral_api_key", mistral_api_key);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating config:", error);
      res.status(500).json({ message: "Failed to update config" });
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
