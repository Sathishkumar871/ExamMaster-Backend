
import "dotenv/config";
import dns from "node:dns";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import {
  stdin as input,
  stdout as output,
} from "node:process";

import JanasevaStaff from "../models/JanasevaStaff";

/* =========================================================
   DNS
========================================================= */

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

/* =========================================================
   TEST STAFF ACCOUNTS
   Only 2 Staff accounts
========================================================= */

const STAFF_ACCOUNTS = [
  {
    name: "Staff Member 1",
    mobile: "9000000001",
    designation: "Field Staff",
  },
  {
    name: "Staff Member 2",
    mobile: "9000000002",
    designation: "Field Staff",
  },
];

/* =========================================================
   MOBILE VALIDATION
========================================================= */

function isValidIndianMobile(
  mobile: string,
): boolean {
  return /^[6-9][0-9]{9}$/.test(
    mobile,
  );
}

/* =========================================================
   CREATE STAFF
========================================================= */

async function createStaff() {
  const rl =
    readline.createInterface({
      input,
      output,
    });

  try {
    const mongoUri =
      process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is missing in .env",
      );
    }

    console.log("");
    console.log(
      "==========================================",
    );
    console.log(
      "     JANASEVA STAFF ACCOUNT CREATOR",
    );
    console.log(
      "==========================================",
    );
    console.log(
      "Creating 2 Staff test accounts",
    );
    console.log(
      "Maximum active devices per Staff: 2",
    );
    console.log("");

    await mongoose.connect(
      mongoUri,
    );

    console.log(
      "✅ MongoDB connected",
    );
    console.log("");

    for (
      let i = 0;
      i < STAFF_ACCOUNTS.length;
      i++
    ) {
      const account =
        STAFF_ACCOUNTS[i];

      console.log(
        `========== STAFF ${i + 1} / 2 ==========`,
      );

      /* =====================================================
         CHECK MOBILE
      ===================================================== */

      if (
        !isValidIndianMobile(
          account.mobile,
        )
      ) {
        console.log(
          `❌ Invalid mobile: ${account.mobile}`,
        );
        continue;
      }

      /* =====================================================
         CHECK EXISTING STAFF
      ===================================================== */

      const existingStaff =
        await JanasevaStaff.findOne({
          mobile: account.mobile,
        }).lean();

      if (existingStaff) {
        console.log(
          `⚠️ Staff already exists: ${account.mobile}`,
        );
        console.log(
          "Skipping this account.",
        );
        console.log("");
        continue;
      }

      /* =====================================================
         PASSWORD
      ===================================================== */

      const password =
        await rl.question(
          `Password for ${account.mobile}: `,
        );

      if (
        password.length < 8
      ) {
        console.log(
          "❌ Password must be at least 8 characters.",
        );
        console.log(
          "Skipping this account.",
        );
        console.log("");
        continue;
      }

      const confirmPassword =
        await rl.question(
          "Confirm password: ",
        );

      if (
        password !==
        confirmPassword
      ) {
        console.log(
          "❌ Passwords do not match.",
        );
        console.log(
          "Skipping this account.",
        );
        console.log("");
        continue;
      }

      /* =====================================================
         HASH PASSWORD
      ===================================================== */

      const hashedPassword =
        await bcrypt.hash(
          password,
          12,
        );

      /* =====================================================
         CREATE STAFF
      ===================================================== */

      const staff =
        await JanasevaStaff.create({
          name: account.name,

          mobile: account.mobile,

          password:
            hashedPassword,

          role: "staff",

          designation:
            account.designation,

          isActive: true,

          sessions: [],
        });

      console.log("");
      console.log(
        "✅ STAFF CREATED",
      );
      console.log(
        `Name        : ${staff.name}`,
      );
      console.log(
        `Mobile      : ${staff.mobile}`,
      );
      console.log(
        `Designation : ${
          staff.designation ||
          "Staff"
        }`,
      );
      console.log(
        `Role        : ${staff.role}`,
      );
      console.log(
        "Max Devices : 2",
      );
      console.log("");
    }

    console.log(
      "==========================================",
    );
    console.log(
      "✅ STAFF SETUP COMPLETED",
    );
    console.log(
      "==========================================",
    );
    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "❌ STAFF CREATION FAILED",
    );

    if (
      error instanceof Error
    ) {
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

createStaff();

