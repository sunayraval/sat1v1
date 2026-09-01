/*
  server/api/questions.ts

  API endpoint that serves random SAT questions from the question bank.
  This moves the heavy 25MB JSON processing to the server side so the
  client bundle stays small.
*/
import { Router, type Request, type Response } from "express";
import { satQuestions } from "@shared/questions";

const router = Router();

/**
 * GET /api/questions/random
 *
 * Query params:
 *   modules    - comma-separated module names (e.g. "math,english")
 *   difficulties - comma-separated difficulty codes (e.g. "E,M,H")
 *   limit      - number of questions to return (default 10, max 50)
 *
 * Returns a JSON array of Question objects.
 */
router.get("/random", (req: Request, res: Response) => {
  try {
    const modulesParam = req.query.modules as string | undefined;
    const difficultiesParam = req.query.difficulties as string | undefined;
    const limitParam = req.query.limit as string | undefined;

    const modules = modulesParam
      ? modulesParam.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean)
      : [];
    const difficulties = difficultiesParam
      ? difficultiesParam.split(",").map((d) => d.trim()).filter(Boolean)
      : [];
    const limit = Math.min(Math.max(parseInt(limitParam || "10", 10) || 10, 1), 50);

    let filtered = satQuestions.slice();

    if (modules.length > 0) {
      filtered = filtered.filter((q) =>
        modules.includes((q.module || "").toLowerCase())
      );
    }

    if (difficulties.length > 0) {
      filtered = filtered.filter(
        (q) => q.difficulty && difficulties.includes(q.difficulty)
      );
    }

    if (filtered.length === 0) {
      return res.status(200).json([]);
    }

    // Fisher-Yates shuffle
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }

    const selected = filtered.slice(0, limit);
    return res.json(selected);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/**
 * GET /api/questions/modules
 *
 * Returns the list of available modules (e.g. ["math", "english"]).
 */
router.get("/modules", (_req: Request, res: Response) => {
  const moduleSet = new Set<string>();
  satQuestions.forEach((q) => {
    const m = (q.module || "").toLowerCase();
    if (m) moduleSet.add(m);
  });
  return res.json(Array.from(moduleSet));
});

export default router;
