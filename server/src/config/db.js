import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failure");
    process.exit(1);
  }
};

export default connectDB;
