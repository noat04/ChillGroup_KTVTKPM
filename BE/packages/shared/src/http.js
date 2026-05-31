import express from "express";
import cors from "cors";

export function createHttpApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  return app;
}

export function errorHandler(error, _req, res, _next) {
  res.status(400).json({
    error: error instanceof Error ? error.message : "Bad request"
  });
}
