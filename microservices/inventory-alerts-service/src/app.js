import cors from "cors";
import express from "express";
import { z } from "zod";
import { buildInventoryAlerts } from "./alerts.js";

const serviceName = "inventory-alerts-service";

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional().nullable(),
  stock: z.coerce.number().optional().default(0),
  minStock: z.coerce.number().optional().default(0),
  expirationDate: z.string().optional().nullable()
});

const alertsSchema = z.object({
  items: z.array(itemSchema).default([]),
  expiringSoonDays: z.coerce.number().int().positive().max(730).optional().default(180)
});

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "512kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: serviceName
    });
  });

  app.post("/alerts", (req, res, next) => {
    try {
      const data = alertsSchema.parse(req.body);
      res.json({
        data: buildInventoryAlerts(data)
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
