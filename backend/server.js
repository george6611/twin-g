// backend/server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { sanitizeNoSQLInput } = require("./utils/inputValidator");

dotenv.config();
mongoose.set("strictQuery", true);

const app = express();
const server = http.createServer(app);

/* =======================================================
   🌐 SOCKET.IO SETUP
======================================================= */

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? process.env.CLIENT_URL
      : "*",
  },
});

// Make io accessible in routes
app.set("io", io);
app.set("pendingTransactions", {});

/* =======================================================
   🧩 GLOBAL MIDDLEWARE
======================================================= */

// CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server tools and curl/postman requests without Origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.JWT_SECRET)); // Use JWT_SECRET for signing cookies

// Custom NoSQL injection protection (Express 5 compatible)
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeNoSQLInput(req.body);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeNoSQLInput(req.params);
  }
  // Note: req.query is read-only in Express 5, sanitize at controller level if needed
  next();
});

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Dev logging
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/* =======================================================
   💬 SOCKET EVENTS
======================================================= */

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("joinConversation", (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`📍 Joined conversation: ${conversationId}`);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const { conversationId, senderId, senderType, text } = data;

      io.to(`conversation_${conversationId}`).emit("message", {
        senderId,
        senderType,
        conversationId,
        text,
        createdAt: Date.now(),
      });

      console.log(`💬 Message sent → conversation ${conversationId}`);
    } catch (err) {
      console.error("❌ Socket message error:", err.message);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("markRead", ({ conversationId }) => {
    io.to(`conversation_${conversationId}`).emit("messageRead");
  });

  socket.on("userTyping", ({ conversationId, userName }) => {
    io.to(`conversation_${conversationId}`).emit("userTyping", {
      userName,
    });
  });

  // 📍 ORDER TRACKING EVENTS
  socket.on("joinOrderTracking", ({ orderId, userId }) => {
    socket.join(`tracking_${orderId}`);
    console.log(`📍 User ${userId} joined live tracking for order ${orderId}`);
  });

  socket.on("leaveOrderTracking", ({ orderId, userId }) => {
    socket.leave(`tracking_${orderId}`);
    console.log(`🚪 User ${userId} left live tracking for order ${orderId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

/* =======================================================
   🩺 HEALTH CHECK
======================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});



(async function startServer() {

  const startupTimeout = setTimeout(() => {
    console.error("\n❌ ⏱️ STARTUP TIMEOUT - Server is hanging!");
    console.error("Check MongoDB connection and Agenda initialization");
    process.exit(1);
  }, 30000);
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📡 Connecting to MongoDB...");
    mongoose.connection.on('connected', () => {
      console.log('📦 Mongoose connection event: connected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('🐞 Mongoose connection error event:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  Mongoose disconnected');
    });

    // ensure environment variable is set and has proper scheme
    const rawUri = process.env.MONGO_URI && process.env.MONGO_URI.trim();
    if (!rawUri) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    let mongoUri = rawUri;
    if (!/^mongodb(\+srv)?:\/\//i.test(rawUri)) {
      console.warn('⚠️  MONGO_URI missing scheme, prepending "mongodb://" for you');
      mongoUri = 'mongodb://' + rawUri;
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });

    console.log("✅ MongoDB connected successfully");

    /* ==========================
       ⏰ Initialize Agenda
    =========================== */
    console.log("⏰ Initializing Agenda...");
    const { initAgenda } = require("./utils/agenda");
    const agendaInstance = await initAgenda();
    console.log("✅ Agenda initialized");

    console.log("📋 Defining Agenda jobs...");
    const defineNotifyRidersJob = require("./utils/notifyRiders");
    defineNotifyRidersJob(agendaInstance, io);
    console.log("✅ Agenda jobs defined");

    console.log("📅 Scheduling old ready orders...");
    try {
      const scheduleOldReadyOrders = require("./utils/scheduleOrders");
      await scheduleOldReadyOrders();
      console.log("✅ Old ready orders scheduled");
    } catch (scheduleErr) {
      console.warn("⚠️  Warning: Could not schedule old ready orders:", scheduleErr.message);
      // Don't fail startup for scheduling errors
    }
    const scheduleOldReadyOrders = require("./utils/scheduleOrders");
    await scheduleOldReadyOrders();
    console.log("✅ Old ready orders scheduled");

    /* =======================================================
       🚦 RATE LIMITING
    ======================================================= */
    // Strict rate limit for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes
      message: "Too many authentication attempts, please try again later",
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        const path = req.path || "";
        const originalUrl = req.originalUrl || "";
        const target = `${originalUrl}${path}`;
        return (
          path === "/me" ||
          path === "/verify" ||
          path === "/sessions" ||
          originalUrl.startsWith("/api/auth/me") ||
          originalUrl.startsWith("/api/auth/verify") ||
          originalUrl.startsWith("/api/auth/sessions") ||
          target.includes("/api/auth/me")
        );
      },
    });

    // Stricter rate limit for file uploads
    const uploadLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50, // 50 uploads per 15 minutes
      message: "Too many upload requests, please try again later",
    });

    // General API rate limit
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500, // 500 requests per 15 minutes per IP
      message: "Too many requests, please try again later",
    });

    // Apply general rate limit to all /api routes
    app.use("/api/", apiLimiter);

    app.get("/health", (req, res) => {
  res.status(200).send("Server is awake");
});


    /* =======================================================
       🔐 AUTHENTICATION ROUTES (with rate limiting)
    ======================================================= */
    // Unified auth routes (login, logout, refresh, me, etc.)
    app.use("/api/auth", authLimiter, require("./routes/auth/unified"));
    
    app.use("/api/auth/login", authLimiter, require("./routes/auth/login"));
    app.use("/auth/login", authLimiter, require("./routes/auth/login"));
    app.use("/api/auth/customer", authLimiter, require("./routes/auth/customer"));
    app.use("/auth/customer", authLimiter, require("./routes/auth/customer"));
    app.use("/api/auth/rider", authLimiter, require("./routes/auth/rider"));
    app.use("/api/auth/vendor", authLimiter, require("./routes/auth/vendor"));

    // VENDORS (nested resources: /api/vendors/:vendorId/*)
    console.log("📦 [SERVER] Registering /api/vendors routes");
    app.use("/api/vendors", require("./routes/vendors"));
    console.log("✅ [SERVER] /api/vendors routes registered");

    // VENDOR (logged-in vendor routes)
    app.use("/api/vendor/profile", require("./routes/vendor/profile"));
    app.use("/api/vendor/products", require("./routes/vendor/products"));
    app.use("/api/vendor/orders", require("./routes/vendor/orders"));
    app.use("/api/vendor/payments", require("./routes/vendor/payments"));
    app.use("/api/vendor/analytics", require("./routes/vendor/analytics"));
    app.use("/api/vendor/reports", require("./routes/vendor/reports"));
    app.use("/api/vendor/support", require("./routes/vendor/support"));
    app.use("/api/vendor/notifications", require("./routes/vendor/notifications"));
    app.use("/api/vendor/reviews", require("./routes/vendor/reviews"));
    app.use("/api/vendor/messages", require("./routes/vendor/messages"));

    // IMPORT (connector-based product imports)
    app.use("/api/import", require("./routes/import"));

    // RIDER
    app.use("/api/rider/profile", require("./routes/rider/profile"));
    app.use("/api/rider/deliveries", require("./routes/rider/deliveries"));
    app.use("/api/rider/earnings", require("./routes/rider/earnings"));
    app.use("/api/rider/support", require("./routes/rider/support"));
    app.use("/api/rider/status", require("./routes/rider/status"));
    app.use("/api/rider/messages", require("./routes/rider/messages"));
    app.use("/api/rider/location", require("./routes/rider/location"));
    app.use("/api/rider/onboarding", require("./routes/rider/onboarding"));

    // CUSTOMER
    app.use("/api/customer/profile", require("./routes/customer/profile"));
    app.use("/api/customer/orders", require("./routes/customer/orders"));
    app.use("/api/customer/products", require("./routes/customer/products"));
    app.use("/api/customer/payments", require("./routes/customer/payments"));
    app.use("/api/customer/support", require("./routes/customer/support"));
    app.use("/api/customer/notifications", require("./routes/customer/notifications"));
    app.use("/api/customer/vendors", require("./routes/customer/vendors"));
    app.use("/api/customer/location", require("./routes/customer/location"));
    app.use("/api/customer/messages", require("./routes/customer/messages"));

    // SHARED
    app.use("/api/vendorPublic", require("./routes/vendor"));
    app.use("/api/shared/delivery", require("./routes/shared/delivery"));
    app.use("/api/shared/transactions", require("./routes/shared/transaction"));
    app.use("/api/shared/wallets", require("./routes/shared/wallet"));
    app.use("/api/shared/messages", require("./routes/shared/message"));
    app.use("/api/shared/addresses", require("./routes/shared/address"));

    // ADMIN
    app.use("/api/admin/onboarding", uploadLimiter, require("./routes/admin/riderOnboarding"));
    app.use("/api/admin/saccos", uploadLimiter, require("./routes/admin/saccoManagement"));
    app.use("/api/shared/sessions", require("./routes/shared/session"));
    app.use("/api/categories", require("./routes/shared/category"));

    // PAYMENTS
    app.use("/api/stkPush", require("./routes/payment/stkPush"));

    /* =======================================================
       ❌ 404 HANDLER
    ======================================================= */
    app.use((req, res) => {
      res.status(404).json({ message: "Route not found" });
    });

    /* =======================================================
       ⚠️ GLOBAL ERROR HANDLER
    ======================================================= */
    app.use((err, req, res, next) => {
      console.error("❌ Global Error:", err.stack);
      res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
      });
    });

    /* =======================================================
       🌍 START SERVER
    ======================================================= */

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      clearTimeout(startupTimeout); // Clear timeout on successful start
      console.log("=".repeat(60));
      console.log(`🌍 Mode: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔌 Server running on PORT: ${PORT}`);
      console.log(`📍 Base URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log("=".repeat(60) + "\n");
    });

  } catch (err) {
    clearTimeout(startupTimeout); // Clear timeout on error
    console.error("❌ Server startup failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();