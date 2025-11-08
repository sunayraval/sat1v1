/*
  routes.ts

  Central place to register API routes for the server. This file is
  intentionally small in the starter project; add application endpoints
  here (mount them on `/api`) so the rest of the server startup code
  remains environment-agnostic.

  Examples of routes you might add here:
  - GET /api/questions -> return shared/questions.json
  - POST /api/score -> persist a finished game result
*/
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
