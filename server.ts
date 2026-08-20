import "dotenv/config";
import cors from "cors"; // <--- 1. ఇక్కడ cors ఇంపోర్ట్ చేయండి

import app from "./app";
import connectDB from "./config/db";
import { connectCloudinary } from "./config/cloudinary";

console.log("🔥🔥🔥 THIS SERVER.TS IS RUNNING");
console.log("🔥 APP LOADED:", !!app);

// 2. ఇక్కడ app.use(cors()) యాడ్ చేయండి
app.use(cors());

const startServer = async () => {
  await connectDB();
  await connectCloudinary();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `🚀 Server running on http://localhost:${PORT}`
    );
  });
};

startServer();