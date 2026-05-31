import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectMongo(dbName) {
  const uri = `${config.mongoUrl}/${dbName}`;
  await mongoose.connect(uri);
  console.log(`mongodb connected: ${dbName}`);
}

