// ─── Parsers ─────────────────────────────────────────────────────────────────

function getTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value) {
  const v = getTrimmedString(value);
  return v || null;
}

function parseEntityId(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value.trim()))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getOptionalId(value) {
  return value === undefined || value === null || value === ""
    ? null
    : parseEntityId(value);
}

function isValidDateTime(value) {
  if (!(value instanceof Date) && (typeof value !== "string" || !value.trim())) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function parseMoney(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : 0;
  }
  if (typeof value !== "number" && (typeof value !== "string" || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

/**
 * Valida un objeto de entrada contra un mapa de reglas SATS.
 * @param {Object} data - Datos recibidos en el request.
 * @param {Object} rules - Mapa de reglas { campo: { required: bool, type: 'id'|'money'|'date'|'string' } }
 * @returns {Object} { valid: bool, sanitizedData: Object, errors: Array }
 */
function validateSATS(data, rules) {
  const sanitizedData = {};
  const errors = [];

  if (!data || typeof data !== "object") {
    return { valid: false, sanitizedData: {}, errors: ["Los datos de entrada no son validos."] };
  }

  for (const [field, rule] of Object.entries(rules)) {
    let value = data[field];

    // 1. Manejo de Datos Faltantes (SATS: Missing Data)
    if (value === undefined || value === null || value === "") {
      if (rule.required) {
        errors.push(`El campo ${field} es obligatorio.`);
        continue;
      } else {
        sanitizedData[field] = null; // Normalización a null
        continue;
      }
    }

    // 2. Revisión de Discriminadores (SATS: Discriminators/Types)
    switch (rule.type) {
      case 'id':
        const id = parseEntityId(value);
        if (id === null) errors.push(`El campo ${field} debe ser un ID valido.`);
        else sanitizedData[field] = id;
        break;
      case 'money':
        const money = parseMoney(value, { allowNull: !rule.required });
        if (money === null) errors.push(`El campo ${field} debe ser un valor numerico valido.`);
        else sanitizedData[field] = money;
        break;
      case 'date':
        if (!isValidDateTime(value)) errors.push(`El campo ${field} debe ser una fecha valida.`);
        else sanitizedData[field] = new Date(value);
        break;
      case 'string':
        const str = getTrimmedString(value);
        if (rule.required && !str) errors.push(`El campo ${field} no puede estar vacio.`);
        sanitizedData[field] = str || null;
        break;
      default:
        sanitizedData[field] = value;
    }
  }

  return {
    valid: errors.length === 0,
    sanitizedData,
    errors
  };
}

// ─── Respuestas de error comunes ──────────────────────────────────────────────

function sendInvalidId(res, entityName) {
  return res.status(400).json({ message: `El id de ${entityName} no es valido.` });
}

const REFERENCING_TABLE_LABELS = {
  citas: "citas",
  visitas_medicas: "visitas medicas",
  ordenes_laboratorio: "ordenes de laboratorio",
  resultados_laboratorio: "resultados de laboratorio",
  prescripciones: "prescripciones",
  cargos_paciente: "cargos",
  pagos: "pagos",
  usuarios: "usuarios",
  triajes: "triajes",
  movimientos_insumos_laboratorio: "movimientos de insumos",
};

function handleDatabaseError(error, res, fallbackMessage) {
  console.error(error);

  const CONSTRAINT_MESSAGES = {
    pacientes_dni_key: "Ya existe un paciente con ese DNI.",
    medicos_licencia_key: "Ya existe un medico con esa licencia.",
    visitas_medicas_id_cita_key: "La cita ya tiene una visita medica asociada.",
    citas_medico_fecha_activa_key: "El medico ya tiene una cita activa programada en ese mismo horario.",
    resultados_laboratorio_id_orden_key: "La orden de laboratorio ya tiene un resultado registrado.",
    cargos_paciente_referencia_tipo_referencia_id_key: "El cargo para este registro ya existe.",
  };

  if (error.code === "23505") {
    const msg = CONSTRAINT_MESSAGES[error.constraint] || "El registro ya existe.";
    return res.status(409).json({ message: msg });
  }

  if (error.code === "23503") {
    // Distinguir entre dos causas posibles del mismo codigo de error:
    // 1) Se intento insertar/actualizar con una referencia a un registro padre inexistente.
    // 2) Se intento eliminar un registro que todavia tiene otros registros (hijos) que lo referencian.
    const detail = error.detail || "";
    const stillReferenced = /is still referenced from table "([^"]+)"/.exec(detail);

    if (stillReferenced) {
      const tableName = stillReferenced[1];
      const label = REFERENCING_TABLE_LABELS[tableName] || tableName;
      return res.status(409).json({
        message: `No se puede eliminar: tiene ${label} asociadas. Elimine o reasigne esos registros primero.`,
      });
    }

    return res.status(400).json({
      message: "Una de las referencias relacionadas no existe en la base de datos.",
    });
  }

  if (error.code === "22P02") {
    return res.status(400).json({ message: "El formato de uno de los datos es invalido." });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      message: "Uno de los valores enviados no cumple las reglas definidas.",
    });
  }

  return res.status(500).json({ message: fallbackMessage });
}

// ─── Paginación ───────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginatedResponse(rows, total, page, limit) {
  return {
    data: rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getTrimmedString,
  getOptionalString,
  parseEntityId,
  getOptionalId,
  isValidDateTime,
  parseMoney,
  roundMoney,
  sendInvalidId,
  handleDatabaseError,
  parsePagination,
  buildPaginatedResponse,
};
