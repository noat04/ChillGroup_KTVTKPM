import Redis from "ioredis";
import { config } from "./config.js";

export function createRedis() {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null
  });
}

