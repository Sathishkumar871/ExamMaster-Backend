import "dotenv/config"; // ఇది ఎప్పుడూ అన్నిటికంటే మొదటి లైన్‌లో ఉండాలి

import app from "./app";
import connectDB from "./config/db";
import { connectCloudinary } from "./config/cloudinary";

const startServer = async () => {
  // MongoDB
  await connectDB();
  await connectCloudinary();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();