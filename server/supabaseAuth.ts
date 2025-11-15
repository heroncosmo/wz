import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Criar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_URL ou SUPABASE_SERVICE_KEY não configurados. Usando valores padrão.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração de sessão (mantém compatibilidade com o código existente)
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  const cookieSecure = (process.env.COOKIE_SECURE === '1' || process.env.COOKIE_SECURE === 'true')
    ? true
    : false; // default false for local/dev to ensure cookie on http

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// Função para criar/atualizar usuário no banco de dados
async function upsertUser(user: any, name?: string, phone?: string) {
  await storage.upsertUser({
    id: user.id,
    email: user.email,
    name: name || user.user_metadata?.name || user.email?.split('@')[0] || '',
    phone: phone || user.user_metadata?.phone || '',
    profileImageUrl: user.user_metadata?.avatar_url || '',
  });
}

// Setup de autenticação
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Rota de login - redireciona para página de login do frontend
  app.get("/api/login", (req, res) => {
    // No Supabase, o login é feito pelo frontend
    // Esta rota apenas redireciona para a landing page
    res.redirect("/");
  });

  // Rota de callback (não mais necessária com Supabase, mas mantida para compatibilidade)
  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  // Rota de logout
  app.get("/api/logout", async (req, res) => {
    try {
      // Limpar sessão do servidor (se existir)
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
          }
        });
      }
      // Limpar cookie de sessão padrão do express-session
      res.clearCookie("connect.sid");
    } catch (e) {
      console.error("Erro no logout:", e);
    }

    // Redirecionar para login
    res.redirect("/login");
  });

  // Rota para obter usuário atual (compatível com o código existente)
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Verificar se há token de autenticação
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verificar token com Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Criar/atualizar usuário no banco de dados
      await upsertUser(user);

      // Buscar usuário completo do banco de dados
      const dbUser = await storage.getUser(user.id);
      
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(dbUser);
    } catch (error) {
      console.error("Erro ao obter usuário:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para registro de novo usuário
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, phone } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      if (!name || name.length < 3) {
        return res.status(400).json({ message: "Nome completo é obrigatório (mínimo 3 caracteres)" });
      }

      if (!phone) {
        return res.status(400).json({ message: "Telefone é obrigatório" });
      }

      // Validar e formatar telefone
      const { validateAndFormatPhone } = await import('./phoneValidator');
      const formattedPhone = validateAndFormatPhone(phone);

      if (!formattedPhone) {
        return res.status(400).json({ message: "Telefone inválido. Use formato: 11999999999 ou +5511999999999" });
      }

      // Nota: Removida verificação de telefone duplicado - múltiplos usuários podem usar mesmo número
      // Apenas email continua sendo único

      // Criar usuário no Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: name,
          phone: formattedPhone,
        }
      });

      if (error) {
        console.error("Erro ao criar usuário:", error);
        return res.status(400).json({ message: error.message });
      }

      if (!data.user) {
        return res.status(400).json({ message: "Falha ao criar usuário" });
      }

      // Criar usuário no banco de dados
      await upsertUser(data.user, name, formattedPhone);

      // Enviar mensagem de boas-vindas (não bloqueia o cadastro)
      try {
        const { sendWelcomeMessage } = await import('./whatsapp');
        await sendWelcomeMessage(formattedPhone);
      } catch (welcomeError) {
        console.error("Erro ao enviar mensagem de boas-vindas:", welcomeError);
        // Não retorna erro, apenas loga
      }

      res.json({
        success: true,
        user: data.user
      });
    } catch (error) {
      console.error("Erro ao registrar usuário:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para login
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Fazer login no Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Erro ao fazer login:", error);
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({ message: "Falha no login" });
      }

      // Criar/atualizar usuário no banco de dados
      await upsertUser(data.user);

      res.json({ 
        success: true,
        session: data.session,
        user: data.user
      });
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
}

// Middleware de autenticação (compatível com o código existente)
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Adicionar usuário ao request (compatível com código existente)
    req.user = {
      claims: {
        sub: user.id,
        email: user.email,
      }
    };

    next();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};
