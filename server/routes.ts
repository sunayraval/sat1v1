import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import questionsRouter from "./api/questions";
import roomsRouter, { setupRoomsWebSocket } from "./api/rooms";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mount the questions and rooms APIs
  app.use("/api/questions", questionsRouter);
  app.use("/api/rooms", roomsRouter);

  const httpServer = createServer(app);
  setupRoomsWebSocket(httpServer);

  return httpServer;
}
