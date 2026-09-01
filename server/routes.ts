import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import questionsRouter from "./api/questions";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount the questions API
  app.use("/api/questions", questionsRouter);

  const httpServer = createServer(app);

  return httpServer;
}
