const express = require("express");
const pool = require("../../config/db");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const { logAuditEvent } = require("../../services/audit");

const router = express.Router();
router.use(requireAuth, requireRole("admin", "medico", "enfermero"));

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_NAME = 200;
const MAX_DESCRIPTION = 1000;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

const isId = (value) => /^\d+$/.test(String(value)) && Number(value) > 0 && Number.isSafeInteger(Number(value));

// Se mantiene la respuesta como arreglo (compatible con el frontend actual),
// con limit/offset opcionales y filtro por paciente.
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const params = [];
    let where = "";

    if (req.query.id_paciente !== undefined) {
      if (!isId(req.query.id_paciente)) return res.status(400).json({ message: "ID de paciente invalido." });
      params.push(Number(req.query.id_paciente));
      where = `WHERE d.id_paciente = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT d.id, d.id_paciente, d.nombre, d.descripcion, d.tipo, d.created_at,
              octet_length(d.contenido) AS bytes, p.nombre AS paciente
       FROM documentos_paciente d
       JOIN pacientes p ON p.id_paciente = d.id_paciente
       ${where}
       ORDER BY d.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    res.json(result.rows);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const b = req.body || {};
    const descripcion = typeof b.descripcion === "string" ? b.descripcion.trim() : "";

    if (
      !isId(b.id_paciente) ||
      typeof b.nombre !== "string" || !b.nombre.trim() || b.nombre.length > MAX_NAME ||
      !ALLOWED_TYPES.has(b.tipo) ||
      typeof b.contenido !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(b.contenido)
    ) {
      return res.status(400).json({ message: "Paciente, nombre y archivo válido son obligatorios." });
    }
    if (descripcion.length > MAX_DESCRIPTION) {
      return res.status(400).json({ message: `La descripción no puede superar ${MAX_DESCRIPTION} caracteres.` });
    }

    const content = Buffer.from(b.contenido, "base64");
    if (!content.length || content.length > MAX_BYTES) {
      return res.status(400).json({ message: "El archivo debe tener contenido y pesar hasta 5 MB." });
    }

    const result = await pool.query(
      `INSERT INTO documentos_paciente (id_paciente, nombre, descripcion, tipo, contenido, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [Number(b.id_paciente), b.nombre.trim(), descripcion, b.tipo, content, req.usuario.id_usuario]
    );

    await logAuditEvent({
      usuario: req.usuario,
      accion: "documento.subido",
      entidad: "documento_paciente",
      idEntidad: result.rows[0].id,
      descripcion: `Subio un documento al paciente #${Number(b.id_paciente)}.`,
      metadata: { tipo: b.tipo, bytes: content.length },
    });
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === "23503") return res.status(400).json({ message: "El paciente no existe." });
    next(e);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "ID inválido." });
    const d = (await pool.query(
      "SELECT nombre, tipo, contenido, id_paciente FROM documentos_paciente WHERE id = $1",
      [req.params.id]
    )).rows[0];
    if (!d) return res.status(404).json({ message: "Documento no encontrado." });

    await logAuditEvent({
      usuario: req.usuario,
      accion: "documento.consultado",
      entidad: "documento_paciente",
      idEntidad: req.params.id,
      descripcion: `Abrio un documento del paciente #${d.id_paciente}.`,
    });
    res.json({ nombre: d.nombre, tipo: d.tipo, contenido: d.contenido.toString("base64") });
  } catch (e) { next(e); }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(400).json({ message: "ID inválido." });
    const result = await pool.query("DELETE FROM documentos_paciente WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ message: "Documento no encontrado." });

    await logAuditEvent({
      usuario: req.usuario,
      accion: "documento.eliminado",
      entidad: "documento_paciente",
      idEntidad: req.params.id,
      descripcion: `Elimino el documento #${req.params.id}.`,
    });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

module.exports = router;
