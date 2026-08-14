
import mongoose from "mongoose";
import dns from "dns";

// ============================================================
// FIX NODE DNS FOR MONGODB SRV
// ============================================================

dns.setServers(["8.8.8.8"]);

// ============================================================
// MONGODB CONNECTION
// ============================================================

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI as string
    );

    console.log(
      "✅ MongoDB Connected Successfully"
    );

  } catch (error: any) {

    console.log(
      "❌ MongoDB Connection Failed"
    );

    console.log(
      error.message
    );
  }
};

export default connectDB;

