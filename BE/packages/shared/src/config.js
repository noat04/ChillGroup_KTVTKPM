import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 1. Tạo biến __dirname cho môi trường ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

loadDotEnv();

export const config = {
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  mongoUrl: process.env.MONGO_URL || "mongodb://localhost:27017",
  gatewayPort: Number(process.env.GATEWAY_PORT || 8080),
  userPort: Number(process.env.USER_PORT || 8083),
  productPort: Number(process.env.PRODUCT_PORT || 8081),
  orderPort: Number(process.env.ORDER_PORT || 8082),
  inventoryPort: Number(process.env.INVENTORY_PORT || 8084),
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8083",
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || "http://localhost:8081",
  orderServiceUrl: process.env.ORDER_SERVICE_URL || "http://localhost:8082",
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || "http://localhost:8084",
  jwtSecret: process.env.JWT_SECRET || "fruitweb-dev-secret",
  gatewayRateLimitWindowSeconds: Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_SECONDS || 60),
  gatewayRateLimitMaxRequests: Number(process.env.GATEWAY_RATE_LIMIT_MAX_REQUESTS || 60),
  gatewayAuthRateLimitMaxRequests: Number(process.env.GATEWAY_AUTH_RATE_LIMIT_MAX_REQUESTS || 10),
  gatewayAiRateLimitMaxRequests: Number(process.env.GATEWAY_AI_RATE_LIMIT_MAX_REQUESTS || 5),
  appUrl: process.env.APP_URL || "http://localhost:5173",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  mailFrom: process.env.MAIL_FROM || "Fruitweb <no-reply@fruitweb.local>",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "fruitweb/products",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  eventStream: "fruitweb.events",
  projectionProductsKey: "projection:products",
  inventoryPrefix: "inventory:",
  orderPrefix: "order:"
};

function loadDotEnv() {
  // Uu tien file .env khi chay that, fallback .env.example cho local/demo.
  const beRoot = join(__dirname, "../../..");
  const envPath = existsSync(join(beRoot, ".env"))
    ? join(beRoot, ".env")
    : join(beRoot, ".env.example");

  if (!existsSync(envPath)) {
    console.warn("Config file not found at:", envPath);
    return;
  }

  console.log("Loaded config file:", envPath);

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
