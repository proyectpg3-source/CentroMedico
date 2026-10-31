require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { assertSecureEnv, isProduction } = require("./config/env");
const { apiLimiter } = require("./middlewares/rateLimit");

const { ensureSchema } = require("../schema");
const pool = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");
const schemaReadyMiddleware = require("./middlewares/schemaReady");

// Rutas
const authRoutes = require("./modules/auth/auth.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const pacientesRoutes = require("./modules/pacientes/pacientes.routes");
const medicosRoutes = require("./modules/medicos/medicos.routes");
const citasRoutes = require("./modules/citas/citas.routes");
const visitasRoutes = require("./modules/visitas/visitas.routes");
const laboratorioRoutes = require("./modules/laboratorio/laboratorio.routes");
const prescripcionesRoutes = require("./modules/prescripciones/prescripciones.routes");
const cargosRoutes = require("./modules/cargos/cargos.routes");
const pagosRoutes = require("./modules/pagos/pagos.routes");
const analisisRoutes = require("./modules/analisis/analisis.routes");
const triajesRoutes = require("./modules/triajes/triajes.routes");
const backupsRoutes = require("./modules/backups/backups.routes");
const auditoriaRoutes = require("./modules/auditoria/auditoria.routes");

const app = express();

// CORS "falla cerrado": solo se aceptan los origenes listados en CORS_ORIGIN.
// En desarrollo, si no se define, se permite unicamente el frontend local de Vite.
const DEFAULT_DEV_ORIGIN = "http://localhost:5173";
const CORS_ORIGINS = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = CORS_ORIGINS.length
  ? CORS_ORIGINS
  : isProduction()
    ? []
    : [DEFAULT_DEV_ORIGIN];

app.disable("x-powered-by");
if (process.env.TRUST_PROXY) {
  // Necesario tras un proxy inverso para que el limitador vea la IP real del cliente.
  app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
}
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }));
app.use("/api", apiLimiter);
app.use("/api/documentos", express.json({ limit: "7mb" }));
app.use(express.json({ limit: "100kb" }));

// Esperar a que el schema esté listo antes de servir requests
const schemaReady = ensureSchema(pool);
app.use(schemaReadyMiddleware(schemaReady));

// Info general
app.get("/", (req, res) => {
  if (isProduction()) {
    return res.json({ message: "Servidor del Centro Medico activo." });
  }
  res.json({
    message: "Servidor del Centro Medico activo.",
    endpoints: [
      "/api/health",
      "/api/dashboard/resumen",
      "/api/pacientes",
      "/api/medicos",
      "/api/citas",
      "/api/visitas",
      "/api/laboratorio/insumos",
      "/api/laboratorio/insumos/alertas",
      "/api/laboratorio/insumos/:id/movimientos",
      "/api/laboratorio/ordenes",
      "/api/laboratorio/resultados",
      "/api/prescripciones",
      "/api/cargos",
      "/api/pagos",
      "/api/analisis/priorizacion",
      "/api/analisis/indicadores",
      "/api/triajes",
      "/api/backups/export",
      "/api/auditoria",
      "/api/notificaciones",
    ],
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// Módulos
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/pacientes", pacientesRoutes);
app.use("/api/medicos", medicosRoutes);
app.use("/api/citas", citasRoutes);
app.use("/api/visitas", visitasRoutes);
app.use("/api/laboratorio", laboratorioRoutes);
app.use("/api/prescripciones", prescripcionesRoutes);
app.use("/api/cargos", cargosRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/analisis", analisisRoutes);
app.use("/api/triajes", triajesRoutes);
app.use("/api/atenciones-rapidas", require("./modules/atenciones/atenciones.routes"));
app.use("/api/backups", backupsRoutes);
app.use("/api/auditoria", auditoriaRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/productos", require("./modules/productos/productos.routes"));
app.use("/api/documentos", require("./modules/documentos/documentos.routes"));
app.use("/api/configuracion", require("./modules/configuracion/configuracion.routes"));
app.use("/api/notificaciones", require("./modules/notificaciones/notificaciones.routes"));
// 404
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

// Manejo global de errores
app.use(errorHandler);

// Arrancar servidor solo si se ejecuta directamente
if (require.main === module) {
  assertSecureEnv();
  schemaReady
    .then(() => {
      const PORT = Number(process.env.PORT || 5000);
      app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("No se pudo inicializar el esquema:", error);
      process.exit(1);
    });
}

module.exports = app;
