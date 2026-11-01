// Evaluación de Enfermería con SATS estructurado y motor de propuestas P1–P4.
//
// Adapta los motores de la versión v2 (src/engines) a la tabla `triajes` de este
// proyecto. Funciones puras: no acceden a la base de datos.
//
// Reglas de seguridad que se conservan de v2:
// - Nunca se imputan valores normales a un signo vital faltante.
// - Sin datos suficientes NO se propone nivel (antes el sistema proponía P4).
// - Toda propuesta requiere confirmación del personal autorizado.

const {
  getCatalog,
  normalizeDiscriminatorReview,
  normalizeUnavailableData,
  summarizeReview,
  classifySatsStructured,
  CATALOG_VERSION,
} = require("../../engines/satsStructuredReview");
const { proposePriority } = require("../../engines/priorityProposalEngine");
const { RULESET_VERSION, LEVEL_DETAILS } = require("../../engines/priorityRules.config");

const MOBILITY = ["CAMINA", "CON_AYUDA", "CAMILLA_INMOVIL"];
const CONSCIOUSNESS = ["ALERTA", "CONFUSO", "VOZ", "DOLOR", "NO_RESPONDE"];
const TRAUMA = ["SI", "NO"];
const LEVELS = ["P1", "P2", "P3", "P4"];

// Compatibilidad con las columnas existentes (citas.prioridad_clinica).
const LEGACY_PRIORITY = { P1: "critica", P2: "alta", P3: "media", P4: "baja" };

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function optionalChoice(value, allowed, label) {
  if (value === undefined || value === null || value === "") return null;
  const choice = String(value).trim().toUpperCase();
  if (!allowed.includes(choice)) {
    throw badRequest(`${label} no es válido. Usa: ${allowed.join(", ")}.`);
  }
  return choice;
}

function parseSystolic(presionArterial) {
  const match = String(presionArterial || "").match(/^\s*(\d{1,3})\s*\//);
  return match ? Number(match[1]) : null;
}

function ageInYears(birthDate, reference = new Date()) {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = reference.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    reference.getMonth() < birth.getMonth() ||
    (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

function readJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

// Valida los campos SATS del cuerpo de la solicitud. Lanza 400 si algo no es
// válido. La completitud de la revisión la calcula siempre el servidor.
function sanitizeSats(body = {}) {
  if (Object.prototype.hasOwnProperty.call(body, "revision_completa")) {
    throw badRequest("La completitud de la revisión la calcula el servidor; no la envíes.");
  }
  const review = normalizeDiscriminatorReview(
    body.revision_discriminadores === undefined || body.revision_discriminadores === null
      ? {}
      : readJson(body.revision_discriminadores, null)
  );
  const unavailable = normalizeUnavailableData(readJson(body.datos_no_obtenibles, {}));
  return {
    movilidad: optionalChoice(body.movilidad, MOBILITY, "La movilidad"),
    estado_conciencia: optionalChoice(body.estado_conciencia, CONSCIOUSNESS, "El estado de conciencia"),
    trauma: optionalChoice(body.trauma, TRAUMA, "El trauma"),
    revision_discriminadores: review,
    datos_no_obtenibles: unavailable,
  };
}

// Evalúa un triaje (guardado o en vista previa) y devuelve la clasificación
// estructurada y la propuesta del motor.
function evaluate({ triaje, sats, fechaNacimiento, reference = new Date() }) {
  const edad = ageInYears(fechaNacimiento, reference);
  const vitals = {
    frecuencia_respiratoria: triaje.frecuencia_respiratoria ?? null,
    frecuencia_cardiaca: triaje.frecuencia_cardiaca ?? null,
    presion_sistolica: parseSystolic(triaje.presion_arterial),
    temperatura: triaje.temperatura ?? null,
    saturacion_oxigeno: triaje.saturacion_oxigeno ?? null,
    glucometria: triaje.glucometria ?? null,
  };

  const structured = classifySatsStructured({
    currentCase: {
      edad,
      movilidad: sats.movilidad,
      estado_conciencia: sats.estado_conciencia,
      trauma: sats.trauma,
      signos_vitales: vitals,
    },
    review: sats.revision_discriminadores,
    unavailableData: sats.datos_no_obtenibles,
  });

  const proposal = proposePriority({
    structured,
    satsAssessment: {
      movilidad: sats.movilidad,
      estado_conciencia: sats.estado_conciencia,
      trauma: sats.trauma,
      revision_discriminadores: sats.revision_discriminadores,
      datos_no_obtenibles: sats.datos_no_obtenibles,
    },
    vitals,
  });

  // Aviso explícito cuando falta la edad: sin ella el TEWS de adultos no aplica.
  if (edad === null) {
    proposal.acciones_requeridas = [
      "Registrar la fecha de nacimiento del paciente: sin edad no se puede calcular el TEWS de adultos.",
      ...proposal.acciones_requeridas,
    ];
  }

  return {
    edad,
    structured,
    proposal,
    summary: summarizeReview(sats.revision_discriminadores),
  };
}

// Valores que se guardan en las columnas de triajes a partir de la evaluación.
function toColumns(evaluation) {
  const { proposal, structured, summary, edad } = evaluation;
  const nivel = proposal.nivel_propuesto;
  return {
    edad_evaluacion: edad,
    version_catalogo: CATALOG_VERSION,
    revision_completa: summary.revision_completa,
    clasificacion_sats: structured,
    propuesta: proposal,
    estado_propuesta: proposal.estado,
    nivel_propuesto: nivel,
    nivel_maximo_posible: proposal.nivel_maximo_posible,
    version_reglas: proposal.version_reglas,
    requiere_justificacion: proposal.requiere_justificacion_confirmacion === true,
    // Columnas heredadas: sin propuesta no se afirma ninguna prioridad.
    prioridad_clinica: nivel ? LEGACY_PRIORITY[nivel] : "baja",
    puntaje_prioridad: proposal.puntaje_tews_confirmado ?? 0,
    motivos_prioridad: proposal.fundamento,
  };
}

module.exports = {
  MOBILITY,
  CONSCIOUSNESS,
  TRAUMA,
  LEVELS,
  LEGACY_PRIORITY,
  LEVEL_DETAILS,
  RULESET_VERSION,
  getCatalog,
  sanitizeSats,
  evaluate,
  toColumns,
  parseSystolic,
  ageInYears,
  readJson,
};
