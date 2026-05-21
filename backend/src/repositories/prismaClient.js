// src/repositories/prismaClient.js
// Singleton Prisma Client instance used across all repositories.

const { PrismaClient } = require("@prisma/client");

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In development, reuse the Prisma Client across hot-reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
