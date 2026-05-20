try {
  require("dotenv").config();
} catch (e) {
  console.warn("dotenv not installed; skipping .env file loading");
}
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const dns = require("dns");

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

// Prefer well-known public DNS servers for SRV resolution when local
// DNS may refuse SRV queries (works around environments where the
// system DNS blocks SRV/UDP queries). These are fallbacks and can be
// removed if not desired.
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

// DB health endpoint: reports mongoose connection state and retry status
app.get("/health/db", (req, res) => {
  const state =
    mongoose &&
    mongoose.connection &&
    typeof mongoose.connection.readyState === "number"
      ? mongoose.connection.readyState
      : 0;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const status = states[state] || "unknown";
  res.json({
    configured: !!process.env.MONGODB_URI,
    readyState: state,
    status,
    retryScheduled: !!mongoRetryTimer,
  });
});
// Serve local uploaded images (development fallback)
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

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
const MONGO_RETRY_INTERVAL_MS = Number(
  process.env.MONGODB_RETRY_INTERVAL_MS || 30000,
);

let mongoRetryTimer = null;

async function initializeDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn(
      "MONGODB_URI not set; starting server without MongoDB connection",
    );
    return false;
  }

  try {
    await mongoose.connect(uri, { dbName: "pos" });
    console.log("Connected to MongoDB");

    // Ensure default system admin exists
    const User = require("./models/user.model");
    const bcrypt = require("bcrypt");
    const adminUsername = "kiya123";
    const adminPassword = "abc123";
    let admin = await User.findOne({ username: adminUsername });
    if (!admin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      admin = new User({
        name: "System Admin",
        username: adminUsername,
        passwordHash,
        role: "systemAdmin",
      });
      await admin.save();
      console.log("Default system admin user created:", adminUsername);
    } else {
      console.log("System admin user exists:", adminUsername);
    }

    // No development seeding: data must come from the actual database.
    // If temporary seeding is ever required, gate it behind an environment flag such as SEED_TEST_DATA=true.

    // Run an initial subscription check at startup, then periodically.
    const {
      runSubscriptionChecksForAllMarts,
    } = require("./services/subscription.service");
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
    console.error("Failed to connect to MongoDB", err);

    // If using an Atlas SRV connection string, DNS SRV lookups can fail
    // in some environments (corporate DNS, offline machine, or blocked DNS).
    // Provide a clearer hint for common resolution steps.
    try {
      const uriLower = (uri || "").toLowerCase();
      if (
        uriLower.startsWith("mongodb+srv") &&
        err &&
        err.code === "ECONNREFUSED"
      ) {
        console.error(
          "\nHint: DNS SRV lookup for the Atlas host failed (querySrv ECONNREFUSED).",
        );
        console.error(
          " - Ensure this machine has internet access and can resolve DNS SRV records.",
        );
        console.error(
          " - Test with: nslookup -type=SRV _mongodb._tcp.cluster0.terbebv.mongodb.net",
        );
        console.error(
          " - Or use a standard (non-SRV) connection string from MongoDB Atlas 'Connect' -> 'Connect your application' and paste it into .env as MONGODB_URI.",
        );
        console.error(
          " - As a quick local workaround, install MongoDB locally and set MONGODB_URI=mongodb://localhost:27017/",
        );
      }
    } catch (e) {
      // ignore
    }

    if (!mongoRetryTimer) {
      const retryDelay =
        Number.isFinite(MONGO_RETRY_INTERVAL_MS) && MONGO_RETRY_INTERVAL_MS > 0
          ? MONGO_RETRY_INTERVAL_MS
          : 30000;
      console.warn(
        `Will retry MongoDB connection in ${retryDelay}ms while keeping the server online.`,
      );
      mongoRetryTimer = setTimeout(async () => {
        mongoRetryTimer = null;
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
  });

  await initializeDatabase();
}

start();
