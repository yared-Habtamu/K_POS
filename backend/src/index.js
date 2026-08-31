try {
  require("dotenv").config();
} catch (e) {
  console.warn("dotenv not installed; skipping .env file loading");
}
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dns = require("dns");
const prisma = require("./repositories/prismaClient");
const userRepository = require("./repositories/userRepository");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function writeQzAllowedEntry() {
  if (process.platform !== "win32") {
    return;
  }

  const certPath = path.join(__dirname, "..", "certs", "digital-certificate.txt");
  const allowedDat = "C:\\ProgramData\\qz\\allowed.dat";

  try {
    const pem = fs.readFileSync(certPath, "utf8");
    const x509 = new crypto.X509Certificate(pem);
    const der = Buffer.from(
      pem
        .replace(/-----BEGIN CERTIFICATE-----/g, "")
        .replace(/-----END CERTIFICATE-----/g, "")
        .replace(/\s+/g, ""),
      "base64",
    );
    const fingerprint = crypto.createHash("sha1").update(der).digest("hex");

    const extractField = (subject, key) => {
      const match = subject.match(new RegExp(`(?:^|\\n)${key}=([^\\n]+)`));
      return match ? match[1].trim() : "";
    };

    const commonName = extractField(x509.subject, "CN");
    const organization = extractField(x509.subject, "O");

    const pad = (n) => String(n).padStart(2, "0");
    const toQzDate = (dateStr) => {
      const d = new Date(dateStr);
      return (
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
      );
    };

    const validFrom = toQzDate(x509.validFrom);
    const validTo = toQzDate(x509.validTo);
    const line = [fingerprint, commonName, organization, validFrom, validTo, "true"].join("\t");

    let existing = "";
    try {
      existing = fs.readFileSync(allowedDat, "utf8");
    } catch {
      // ignore absent file
    }

    const otherLines = existing
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith(fingerprint));

    const dir = path.dirname(allowedDat);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(allowedDat, [...otherLines, line].join("\n") + "\n", "utf8");

    console.log("[qz] Trusted certificate entry written to", allowedDat);
  } catch (err) {
    console.warn("[qz] Could not write QZ trusted certificate entry:", err.message || err);
  }
}

let server = null;

function shutdown(code = 1) {
  if (server) {
    try {
      server.close(() => process.exit(code));
      return;
    } catch (e) {
      // fall through to immediate exit
    }
  }
  process.exit(code);
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown(1);
});

try {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
  console.log("Using DNS servers:", dns.getServers());
} catch (e) {
  // ignore
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  console.log("Health check ping received:", new Date());
  res.status(200).send("Server is running");
});

// DB health endpoint: reports Prisma connection state
app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      configured: !!process.env.DATABASE_URL,
      readyState: 1,
      status: "connected",
      retryScheduled: !!dbRetryTimer,
    });
  } catch (e) {
    res.json({
      configured: !!process.env.DATABASE_URL,
      readyState: 0,
      status: "disconnected",
      retryScheduled: !!dbRetryTimer,
    });
  }
});

// Serve local uploaded images (development fallback)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Serve QZ Tray public certificate (the private key stays on the server)
app.use("/certs", express.static(path.join(__dirname, "..", "certs"), {
  // Only expose the cert — never the private key
  setHeaders: (res, filePath) => {
    if (path.basename(filePath) === "private-key.pem") {
      res.status(403).end();
    }
  },
}));

// Models and routes
const martsRouter = require("./routes/marts");
const authRouter = require("./routes/auth");
const expensesRouter = require("./routes/expenses");
const assetsRouter = require("./routes/assets");
const salesRouter = require("./routes/sales");
const reportsRouter = require("./routes/reports");
const dailyReportsRouter = require("./routes/dailyReports");
const productsRouter = require("./routes/products");
const productEditRequestsRouter = require("./routes/productEditRequests");
const productAddRequestsRouter = require("./routes/productAddRequests");
const stockTransferRequestsRouter = require("./routes/stockTransferRequests");
const assetActionRequestsRouter = require("./routes/assetActionRequests");
const expenseActionRequestsRouter = require("./routes/expenseActionRequests");
const customersRouter = require("./routes/customers");
const employeesRouter = require("./routes/employees");
const attendanceRouter = require("./routes/attendance");
const notificationsRouter = require("./routes/notifications");
const categoryRouter = require("./routes/categories");
const paymentTypesRouter = require("./routes/paymentTypes");
const expenseCategoriesRouter = require("./routes/expenseCategories");
const subscriptionsRouter = require("./routes/subscriptions");
const openCashRequestsRouter = require("./routes/openCashRequests");
const saleCancellationRequestsRouter = require("./routes/saleCancellationRequests");
const chatRouter = require("./routes/chat");
const qzSignRouter = require("./routes/qzSign");

app.use("/api/expenses", expensesRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/daily-reports", dailyReportsRouter);
app.use("/api/marts", martsRouter);
app.use("/api/auth", authRouter);

// Mount debug endpoints (development only)
try {
  const debugRouter = require("./routes/debug");
  app.use("/api/debug", debugRouter);
  console.log("Debug routes enabled at /api/debug");
} catch (e) {
  console.log("Debug routes not available");
}
app.use("/api/products", productsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/payment-types", paymentTypesRouter);
app.use("/api/expense-categories", expenseCategoriesRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/product-edit-requests", productEditRequestsRouter);
app.use("/api/product-add-requests", productAddRequestsRouter);
app.use("/api/stock-transfer-requests", stockTransferRequestsRouter);
app.use("/api/asset-action-requests", assetActionRequestsRouter);
app.use("/api/expense-action-requests", expenseActionRequestsRouter);
app.use("/api/customers", customersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/open-cash-requests", openCashRequestsRouter);
app.use("/api/sale-cancellation-requests", saleCancellationRequestsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/qz-sign", qzSignRouter);

app.use((err, req, res, next) => {
  console.error("Request handling error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 4000;
const DB_RETRY_INTERVAL_MS = Number(process.env.DB_RETRY_INTERVAL_MS || 30000);

let dbRetryTimer = null;

async function initializeDatabase() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.warn("DATABASE_URL not set; starting server without DB connection");
    return false;
  }

  try {
    // Attempt simple query to ensure connection is successful
    await prisma.$queryRaw`SELECT 1`;
    console.log("Connected to PostgreSQL via Prisma");

    // Ensure default system admin exists
    const adminUsername = "kiya123";
    const adminPassword = "abc123";
    let admin = await userRepository.findByUsername(adminUsername);
    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      admin = await userRepository.create({
        name: "System Admin",
        username: adminUsername,
        passwordHash,
        role: "systemAdmin",
      });
      console.log("Default system admin user created:", adminUsername);
    } else {
      console.log("System admin user exists:", adminUsername);
    }

    // Run an initial subscription check at startup, then periodically.
    const { runSubscriptionChecksForAllMarts } = require("./services/subscription.service");
    try {
      await runSubscriptionChecksForAllMarts({ persist: true });
      console.log("Initial subscription checks completed");
    } catch (checkErr) {
      console.error("Initial subscription checks failed", checkErr);
    }

    const intervalMs = Number(
      process.env.SUBSCRIPTION_CHECK_INTERVAL_MS || 3600000,
    );
    setInterval(
      async () => {
        try {
          await runSubscriptionChecksForAllMarts({ persist: true });
        } catch (checkErr) {
          console.error("Scheduled subscription checks failed", checkErr);
        }
      },
      Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3600000,
    );

    return true;
  } catch (err) {
    console.error("Failed to connect to PostgreSQL", err);

    if (!dbRetryTimer) {
      const retryDelay =
        Number.isFinite(DB_RETRY_INTERVAL_MS) && DB_RETRY_INTERVAL_MS > 0
          ? DB_RETRY_INTERVAL_MS
          : 30000;
      console.warn(
        `Will retry Database connection in ${retryDelay}ms while keeping the server online.`,
      );
      dbRetryTimer = setTimeout(async () => {
        dbRetryTimer = null;
        await initializeDatabase();
      }, retryDelay);
    }

    return false;
  }
}

async function start() {
  // Create HTTP server and upgrade to socket.io
  const http = require("http");
  server = http.createServer(app);
  const { Server } = require("socket.io");
  const io = new Server(server, { cors: { origin: "*" } });

  // wire socket helper
  const socketHelper = require("./socket");
  socketHelper.setIo(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    writeQzAllowedEntry();
  });

  await initializeDatabase();
}

start();
