require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

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
const customersRouter = require("./routes/customers");
const employeesRouter = require("./routes/employees");
const attendanceRouter = require("./routes/attendance");

app.use("/api/expenses", expensesRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/daily-reports", dailyReportsRouter);
app.use("/api/marts", martsRouter);
app.use("/api/auth", authRouter);

// Mount debug endpoints (development only)
try {
  const debugRouter = require('./routes/debug');
  app.use('/api/debug', debugRouter);
  console.log('Debug routes enabled at /api/debug');
} catch (e) {
  console.log('Debug routes not available');
}
app.use("/api/products", productsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/product-edit-requests", productEditRequestsRouter);
app.use("/api/product-add-requests", productAddRequestsRouter);
app.use("/api/stock-transfer-requests", stockTransferRequestsRouter);
app.use("/api/customers", customersRouter);

const PORT = process.env.PORT || 4000;

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in environment");
    process.exit(1);
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

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }

  // Create HTTP server and upgrade to socket.io
  const http = require('http');
  const server = http.createServer(app);
  const { Server } = require('socket.io');
  const io = new Server(server, { cors: { origin: '*' } });

  // wire socket helper
  const socketHelper = require('./socket');
  socketHelper.setIo(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();


