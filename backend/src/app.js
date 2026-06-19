require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");

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

const app = express();

const CORS_ORIGINS = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(cors({ origin: CORS_ORIGINS.length ? CORS_ORIGINS : true }));
app.use(express.json());

// Esperar a que el schema esté listo antes de servir requests
const schemaReady = ensureSchema(pool);
app.use(schemaReadyMiddleware(schemaReady));

// Info general
app.get("/", (req, res) => {
  res.json({
    message: "Servidor del Centro Medico activo.",
    endpoints: [
      "/api/health",
      "/api/dashboard/resumen",
      "/api/pacientes",
      "/api/medicos",
      "/api/citas",
      "/api/visitas",
      "/api/laboratorio/ordenes",
      "/api/laboratorio/resultados",
      "/api/prescripciones",
      "/api/cargos",
      "/api/pagos",
      "/api/analisis/priorizacion",
      "/api/analisis/indicadores",
      "/api/triajes",
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
app.use("/api/auth", authRoutes);
// 404
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada." });
});

// Manejo global de errores
app.use(errorHandler);

// Arrancar servidor solo si se ejecuta directamente
if (require.main === module) {
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
