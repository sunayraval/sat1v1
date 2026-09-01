/*
  api/index.ts

  Vercel serverless function entry point. This wraps the Express app
  so Vercel can invoke it as a serverless function for /api/* routes.
*/
import express from "express";
import questionsRouter from "../server/api/questions";

const app = express();

app.use(express.json());
app.use("/api/questions", questionsRouter);

export default app;
