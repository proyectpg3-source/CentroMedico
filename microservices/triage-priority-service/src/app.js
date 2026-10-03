import cors from "cors";
import express from "express";
import { z } from "zod";
import { calculatePriority } from "./priority.js";

const serviceName = "triage-priority-service";

const prioritySchema = z.object({
  reason: z.string().optional(),
  triageNotes: z.string().optional(),
  chiefComplaint: z.string().optional(),
  currentIllness: z.string().optional(),
  medicalHistory: z.string().optional(),
  birthDate: z.string().optional().nullable(),
  vitalPa: z.string().optional().nullable(),
  vitalTemp: z.coerce.number().optional().nullable(),
  vitalSpo2: z.coerce.number().int().optional().nullable(),
  vitalFc: z.coerce.number().int().optional().nullable(),
  vitalFr: z.coerce.number().int().optional().nullable()
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: serviceName
    });
  });

  app.post("/prioritize", (req, res, next) => {
    try {
      const data = prioritySchema.parse(req.body);
      res.json({
        data: {
          ...calculatePriority(data),
          source: serviceName
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((req, _res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    error.status = 404;
    next(error);
  });

  app.use((error, _req, res, _next) => {
    const status = error.status ?? 400;
    res.status(status).json({
      message: error.message ?? "No se pudo procesar la solicitud.",
      details: error.issues
    });
  });

  return app;
}
