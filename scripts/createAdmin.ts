
import "dotenv/config";
import dns from "node:dns";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import {
  stdin as input,
  stdout as output,
} from "node:process";

import JanasevaPortalUser from "../models/JanasevaPortalUser";

/* =========================================================
   DNS
   MongoDB Atlas SRV connection lookup support
========================================================= */

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

/* =========================================================
   ADMIN CONFIG
========================================================= */

const ADMIN_ID = "12345";
const ADMIN_NAME = "System Administrator";

/* =========================================================
   CREATE ADMIN
========================================================= */

async function createAdmin() {
  const rl = readline.createInterface({
    input,
    output,
  });

  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is missing in .env",
      );
    }

    /* -------------------------------------------------------
       Ask password when script runs
    ------------------------------------------------------- */

    const adminPassword = await rl.question(
      "Enter Admin password: ",
    );

    if (!adminPassword.trim()) {
      throw new Error(
        "Admin password cannot be empty",
      );
    }

    if (adminPassword.length < 8) {
      throw new Error(
        "Admin password must be at least 8 characters long",
      );
    }

    console.log("");
    console.log("Connecting to MongoDB...");

    /* -------------------------------------------------------
       MongoDB connection
    ------------------------------------------------------- */

    await mongoose.connect(mongoUri);

    console.log("✅ MongoDB connected");

    /* -------------------------------------------------------
       Check existing Admin
    ------------------------------------------------------- */

    const existingAdmin =
      await JanasevaPortalUser.findOne({
        adminId: ADMIN_ID,
      });

    if (existingAdmin) {
      console.log("");
      console.log(
        `❌ Admin ID "${ADMIN_ID}" already exists.`,
      );
      console.log(
        "No new Admin account was created.",
      );

      return;
    }

    /* -------------------------------------------------------
       Hash password
    ------------------------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        adminPassword,
        12,
      );

    /* -------------------------------------------------------
       Create Admin
    ------------------------------------------------------- */

    const admin =
      await JanasevaPortalUser.create({
        name: ADMIN_NAME,

        adminId: ADMIN_ID,

        password: hashedPassword,

        role: "admin",

        isActive: true,

        sessions: [],
      });

    /* -------------------------------------------------------
       Success
    ------------------------------------------------------- */

    console.log("");

    console.log(
      "=================================",
    );

    console.log(
      "✅ ADMIN CREATED SUCCESSFULLY",
    );

    console.log(
      "=================================",
    );

    console.log(
      `Admin ID: ${admin.adminId}`,
    );

    console.log(
      `Name: ${admin.name}`,
    );

    console.log(
      `Role: ${admin.role}`,
    );

    console.log(
      "Password: securely hashed",
    );

    console.log(
      "Maximum active devices: 4",
    );

    console.log(
      "=================================",
    );

    console.log("");
  } catch (error) {
    console.error("");

    console.error(
      "❌ Failed to create Admin",
    );

    if (error instanceof Error) {
      console.error(
        error.message,
      );
    } else {
      console.error(error);
    }

    console.error("");
  } finally {
    rl.close();

    await mongoose
      .disconnect()
      .catch(() => {});
  }
}

/* =========================================================
   START
========================================================= */

createAdmin();

