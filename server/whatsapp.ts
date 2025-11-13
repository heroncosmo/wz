import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  WAMessage,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import { storage } from "./storage";
import WebSocket from "ws";
import { generateAIResponse } from "./aiAgent";

interface WhatsAppSession {
  socket: WASocket | null;
  userId: string;
  connectionId: string;
  phoneNumber?: string;
}

interface AdminWhatsAppSession {
  socket: WASocket | null;
  adminId: string;
  phoneNumber?: string;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  adminId?: string;
}

const sessions = new Map<string, WhatsAppSession>();
const adminSessions = new Map<string, AdminWhatsAppSession>();
const wsClients = new Map<string, Set<AuthenticatedWebSocket>>();
const adminWsClients = new Map<string, Set<AuthenticatedWebSocket>>();

// Base directory for storing Baileys multi-file auth state.
// Defaults to current working directory (backwards compatible with ./auth_*)
// You can set SESSIONS_DIR (e.g., "/data/whatsapp-sessions" on Railway volumes)
// to persist sessions between deploys and avoid baking them into the image.
const SESSIONS_BASE = process.env.SESSIONS_DIR || "./";

export function addWebSocketClient(ws: AuthenticatedWebSocket, userId: string) {
  if (!wsClients.has(userId)) {
    wsClients.set(userId, new Set());
  }
  wsClients.get(userId)!.add(ws);

  ws.on("close", () => {
    const userClients = wsClients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        wsClients.delete(userId);
      }
    }
  });
}

export function addAdminWebSocketClient(ws: AuthenticatedWebSocket, adminId: string) {
  if (!adminWsClients.has(adminId)) {
    adminWsClients.set(adminId, new Set());
  }
  adminWsClients.get(adminId)!.add(ws);

  ws.on("close", () => {
    const adminClients = adminWsClients.get(adminId);
    if (adminClients) {
      adminClients.delete(ws);
      if (adminClients.size === 0) {
        adminWsClients.delete(adminId);
      }
    }
  });
}

function broadcastToUser(userId: string, data: any) {
  const userClients = wsClients.get(userId);
  if (!userClients) return;

  userClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastToAdmin(adminId: string, data: any) {
  const adminClients = adminWsClients.get(adminId);
  if (!adminClients) {
    return;
  }

  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

export async function connectWhatsApp(userId: string): Promise<void> {
  try {
    let connection = await storage.getConnectionByUserId(userId);
    
    if (!connection) {
      connection = await storage.createConnection({
        userId,
        isConnected: false,
      });
    }

    const userAuthPath = path.join(SESSIONS_BASE, `auth_${userId}`);
    const { state, saveCreds } = await useMultiFileAuthState(userAuthPath);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
    });

    const session: WhatsAppSession = {
      socket: sock,
      userId,
      connectionId: connection.id,
    };

    sessions.set(userId, session);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection: conn, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrCodeDataURL = await QRCode.toDataURL(qr);
          await storage.updateConnection(session.connectionId, { qrCode: qrCodeDataURL });
          broadcastToUser(userId, { type: "qr", qr: qrCodeDataURL });
        } catch (err) {
          console.error("Error generating QR code:", err);
        }
      }

      if (conn === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        await storage.updateConnection(session.connectionId, {
          isConnected: false,
          qrCode: null,
        });

        broadcastToUser(userId, { type: "disconnected" });
        sessions.delete(userId);

        if (shouldReconnect) {
          console.log("Reconnecting...");
          setTimeout(() => connectWhatsApp(userId), 3000);
        }
      } else if (conn === "open") {
        const phoneNumber = sock.user?.id?.split(":")[0] || "";
        session.phoneNumber = phoneNumber;

        await storage.updateConnection(session.connectionId, {
          isConnected: true,
          phoneNumber,
          qrCode: null,
        });

        broadcastToUser(userId, { type: "connected", phoneNumber });
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      const message = m.messages[0];
      if (!message.message || message.key.fromMe) return;

      try {
        await handleIncomingMessage(session, message);
      } catch (err) {
        console.error("Error handling incoming message:", err);
      }
    });

  } catch (error) {
    console.error("Error connecting WhatsApp:", error);
    throw error;
  }
}

async function handleIncomingMessage(session: WhatsAppSession, waMessage: WAMessage) {
  const remoteJid = waMessage.key.remoteJid;
  if (!remoteJid) return;

  const contactNumber = remoteJid.split("@")[0];
  const messageText = waMessage.message?.conversation || 
                     waMessage.message?.extendedTextMessage?.text || 
                     "[Media]";

  let conversation = await storage.getConversationByContactNumber(
    session.connectionId,
    contactNumber
  );

  if (!conversation) {
    conversation = await storage.createConversation({
      connectionId: session.connectionId,
      contactNumber,
      contactName: waMessage.pushName,
      lastMessageText: messageText,
      lastMessageTime: new Date(),
      unreadCount: 1,
    });
  } else {
    await storage.updateConversation(conversation.id, {
      lastMessageText: messageText,
      lastMessageTime: new Date(),
      unreadCount: (conversation.unreadCount || 0) + 1,
      contactName: waMessage.pushName || conversation.contactName,
    });
  }

  await storage.createMessage({
    conversationId: conversation.id,
    messageId: waMessage.key.id!,
    fromMe: false,
    text: messageText,
    timestamp: new Date(Number(waMessage.messageTimestamp) * 1000),
    isFromAgent: false,
  });

  broadcastToUser(session.userId, {
    type: "new_message",
    conversationId: conversation.id,
    message: messageText,
  });

  // AI Agent Auto-Response
  try {
    const isAgentDisabled = await storage.isAgentDisabledForConversation(conversation.id);
    
    if (!isAgentDisabled) {
      const conversationHistory = await storage.getMessagesByConversationId(conversation.id);
      const aiResponse = await generateAIResponse(
        session.userId,
        conversationHistory,
        messageText
      );

      if (aiResponse && session.socket) {
        const jid = `${contactNumber}@s.whatsapp.net`;
        const sentMessage = await session.socket.sendMessage(jid, { text: aiResponse });

        await storage.createMessage({
          conversationId: conversation.id,
          messageId: sentMessage?.key.id || Date.now().toString(),
          fromMe: true,
          text: aiResponse,
          timestamp: new Date(),
          status: "sent",
          isFromAgent: true,
        });

        await storage.updateConversation(conversation.id, {
          lastMessageText: aiResponse,
          lastMessageTime: new Date(),
        });

        broadcastToUser(session.userId, {
          type: "agent_response",
          conversationId: conversation.id,
          message: aiResponse,
        });

        console.log(`AI Agent responded to ${contactNumber}: ${aiResponse}`);
      }
    }
  } catch (error) {
    console.error("Error generating AI response:", error);
  }
}

export async function sendMessage(userId: string, conversationId: string, text: string): Promise<void> {
  const session = sessions.get(userId);
  if (!session?.socket) {
    throw new Error("WhatsApp not connected");
  }

  const conversation = await storage.getConversation(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Verify ownership
  const connection = await storage.getConnectionByUserId(userId);
  if (!connection || conversation.connectionId !== connection.id) {
    throw new Error("Unauthorized access to conversation");
  }

  const jid = `${conversation.contactNumber}@s.whatsapp.net`;
  
  const sentMessage = await session.socket.sendMessage(jid, { text });

  await storage.createMessage({
    conversationId,
    messageId: sentMessage?.key.id || Date.now().toString(),
    fromMe: true,
    text,
    timestamp: new Date(),
    status: "sent",
  });

  await storage.updateConversation(conversationId, {
    lastMessageText: text,
    lastMessageTime: new Date(),
  });

  broadcastToUser(userId, {
    type: "message_sent",
    conversationId,
    message: text,
  });
}

export async function disconnectWhatsApp(userId: string): Promise<void> {
  const session = sessions.get(userId);
  if (session?.socket) {
    await session.socket.logout();
    sessions.delete(userId);
  }

  const connection = await storage.getConnectionByUserId(userId);
  if (connection) {
    await storage.updateConnection(connection.id, {
      isConnected: false,
      qrCode: null,
    });
  }

  broadcastToUser(userId, { type: "disconnected" });
}

export function getSession(userId: string): WhatsAppSession | undefined {
  return sessions.get(userId);
}

export function getAdminSession(adminId: string): AdminWhatsAppSession | undefined {
  return adminSessions.get(adminId);
}

export async function connectAdminWhatsApp(adminId: string): Promise<void> {
  try {
    let connection = await storage.getAdminWhatsappConnection(adminId);

    if (!connection) {
      connection = await storage.createAdminWhatsappConnection({
        adminId,
        isConnected: false,
      });
    }

    const adminAuthPath = path.join(SESSIONS_BASE, `auth_admin_${adminId}`);
    const { state, saveCreds } = await useMultiFileAuthState(adminAuthPath);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
    });

    adminSessions.set(adminId, {
      socket,
      adminId,
    });

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection: connStatus, lastDisconnect, qr } = update;

      if (qr) {
        const qrCodeDataUrl = await QRCode.toDataURL(qr);
        await storage.updateAdminWhatsappConnection(adminId, {
          qrCode: qrCodeDataUrl,
        });
        broadcastToAdmin(adminId, { type: "qr", qr: qrCodeDataUrl });
      }

      if (connStatus === "open") {
        const phoneNumber = socket.user?.id.split(":")[0];
        await storage.updateAdminWhatsappConnection(adminId, {
          isConnected: true,
          phoneNumber,
          qrCode: null,
        });

        const session = adminSessions.get(adminId);
        if (session) {
          session.phoneNumber = phoneNumber;
        }

        broadcastToAdmin(adminId, { type: "connected", phoneNumber });
        console.log(`Admin ${adminId} WhatsApp connected: ${phoneNumber}`);
      }

      if (connStatus === "close") {
        const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log(`Admin ${adminId} WhatsApp disconnected, reconnecting...`);
          setTimeout(() => connectAdminWhatsApp(adminId), 3000);
        } else {
          adminSessions.delete(adminId);
          await storage.updateAdminWhatsappConnection(adminId, {
            isConnected: false,
            qrCode: null,
          });
          broadcastToAdmin(adminId, { type: "disconnected" });
        }
      }
    });
  } catch (error) {
    console.error(`Error connecting admin ${adminId} WhatsApp:`, error);
    throw error;
  }
}

export async function disconnectAdminWhatsApp(adminId: string): Promise<void> {
  const session = adminSessions.get(adminId);
  if (session?.socket) {
    await session.socket.logout();
    adminSessions.delete(adminId);
  }

  const connection = await storage.getAdminWhatsappConnection(adminId);
  if (connection) {
    await storage.updateAdminWhatsappConnection(adminId, {
      isConnected: false,
      qrCode: null,
    });
  }

  broadcastToAdmin(adminId, { type: "disconnected" });
}

export async function sendWelcomeMessage(userPhone: string): Promise<void> {
  try {
    console.log(`[WELCOME] Iniciando envio de mensagem de boas-vindas para ${userPhone}`);

    // Obter configuração de mensagem de boas-vindas
    const enabledConfig = await storage.getSystemConfig('welcome_message_enabled');
    const messageConfig = await storage.getSystemConfig('welcome_message_text');

    if (!enabledConfig || enabledConfig.valor !== 'true') {
      console.log('[WELCOME] Mensagem de boas-vindas desabilitada');
      return;
    }

    if (!messageConfig || !messageConfig.valor) {
      console.log('[WELCOME] Mensagem de boas-vindas não configurada');
      return;
    }

    console.log('[WELCOME] Configuração encontrada, procurando admin...');

    // Obter admin (assumindo que há apenas um admin owner)
    const allAdmins = await storage.getAllAdmins();
    const adminUser = allAdmins.find(a => a.role === 'owner');

    if (!adminUser) {
      console.log('[WELCOME] Admin não encontrado');
      return;
    }

    console.log(`[WELCOME] Admin encontrado: ${adminUser.id}`);

    // Verificar se admin tem WhatsApp conectado
    const adminConnection = await storage.getAdminWhatsappConnection(adminUser.id);

    if (!adminConnection || !adminConnection.isConnected) {
      console.log('[WELCOME] Admin WhatsApp não conectado');
      return;
    }

    console.log('[WELCOME] Admin WhatsApp conectado, procurando sessão...');

    let adminSession = adminSessions.get(adminUser.id);

    // Se a sessão não existe, tentar restaurá-la
    if (!adminSession || !adminSession.socket) {
      console.log('[WELCOME] Admin WhatsApp session não encontrada, tentando restaurar...');
      try {
        await connectAdminWhatsApp(adminUser.id);
        adminSession = adminSessions.get(adminUser.id);

        if (!adminSession || !adminSession.socket) {
          console.log('[WELCOME] Falha ao restaurar sessão do admin');
          return;
        }

        console.log('[WELCOME] Sessão do admin restaurada com sucesso');
      } catch (restoreError) {
        console.error('[WELCOME] Erro ao restaurar sessão do admin:', restoreError);
        return;
      }
    }

    console.log('[WELCOME] Sessão encontrada, enviando mensagem...');

    // Formatar número para envio (remover + e adicionar @s.whatsapp.net)
    const formattedNumber = userPhone.replace('+', '') + '@s.whatsapp.net';

    // Enviar mensagem
    await adminSession.socket.sendMessage(formattedNumber, {
      text: messageConfig.valor,
    });

    console.log(`[WELCOME] ✅ Mensagem de boas-vindas enviada com sucesso para ${userPhone}`);
  } catch (error) {
    console.error('[WELCOME] ❌ Erro ao enviar mensagem de boas-vindas:', error);
    // Não lança erro para não bloquear o cadastro
  }
}

export async function restoreExistingSessions(): Promise<void> {
  try {
    console.log("Checking for existing WhatsApp connections...");
    const connections = await storage.getAllConnections();

    for (const connection of connections) {
      if (connection.isConnected && connection.userId) {
        console.log(`Restoring WhatsApp session for user ${connection.userId}...`);
        try {
          await connectWhatsApp(connection.userId);
        } catch (error) {
          console.error(`Failed to restore session for user ${connection.userId}:`, error);
          await storage.updateConnection(connection.id, {
            isConnected: false,
            qrCode: null,
          });
        }
      }
    }
    console.log("Session restoration complete");
  } catch (error) {
    console.error("Error restoring sessions:", error);
  }
}

export async function restoreAdminSessions(): Promise<void> {
  try {
    console.log("Checking for existing admin WhatsApp connections...");
    const allAdmins = await storage.getAllAdmins();

    for (const admin of allAdmins) {
      const adminConnection = await storage.getAdminWhatsappConnection(admin.id);

      if (adminConnection && adminConnection.isConnected) {
        console.log(`Restoring admin WhatsApp session for admin ${admin.id}...`);
        try {
          await connectAdminWhatsApp(admin.id);
          console.log(`✅ Admin WhatsApp session restored for ${admin.id}`);
        } catch (error) {
          console.error(`Failed to restore admin session for ${admin.id}:`, error);
          await storage.updateAdminWhatsappConnection(admin.id, {
            isConnected: false,
            qrCode: null,
          });
        }
      }
    }
    console.log("Admin session restoration complete");
  } catch (error) {
    console.error("Error restoring admin sessions:", error);
  }
}
