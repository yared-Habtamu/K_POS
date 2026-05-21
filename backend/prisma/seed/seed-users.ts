// TypeScript seed - users
import dotenv from "dotenv";
dotenv.config();

const bcrypt = require("bcrypt");
const prisma = require("../../src/repositories/prismaClient");
const userRepository = require("../../src/repositories/userRepository");
const martRepository = require("../../src/repositories/martRepository");

async function seed() {
  try {
    let testMart = await martRepository.findOne({
      martName: "Test Marketplace",
    });
    if (!testMart) {
      testMart = await martRepository.create({
        martName: "Test Marketplace",
        phone: "0900000000",
        city: "Addis Ababa",
        status: "approved",
        taxRate: 15,
      });
      console.log("Created Test Mart:", testMart.id);
    } else {
      console.log("Using existing Test Mart:", testMart.id);
    }

    const passwordHash = await bcrypt.hash("password123", 10);
    const roles = ["owner", "manager", "cashier", "storeKeeper"];

    for (const role of roles) {
      const username = `test_${role.toLowerCase()}`;
      const existingUser = await userRepository.findOne({ username });

      if (!existingUser) {
        const newUser = await userRepository.create({
          name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          username,
          passwordHash,
          role,
          martId: testMart.id,
          active: true,
        });
        console.log(`Created user: ${username} (Role: ${role})`);
      } else {
        console.log(`User already exists: ${username}`);
      }
    }

    const sysAdminUsername = "test_admin";
    if (!(await userRepository.findOne({ username: sysAdminUsername }))) {
      const sysAdmin = await userRepository.create({
        name: "Test System Admin",
        username: sysAdminUsername,
        passwordHash,
        role: "systemAdmin",
        active: true,
      });
      console.log(`Created user: ${sysAdminUsername} (Role: systemAdmin)`);
    }

    console.log("\nSeeding completed successfully!");
    console.log("Default password for all new users: password123");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seed();
