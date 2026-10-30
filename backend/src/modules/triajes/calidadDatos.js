// Adaptacion de la preparacion estricta y evidencia de la version alternativa.
// Describe datos disponibles; no introduce umbrales ni prioridades clinicas.
const SIGNS = {
  presion_arterial: 'Presión arterial',
  frecuencia_cardiaca: 'Frecuencia cardíaca',
  frecuencia_respiratoria: 'Frecuencia respiratoria',
  temperatura: 'Temperatura',
  saturacion_oxigeno: 'Saturación de oxígeno',
};
function isMissing(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}
function parseNumber(value, integer = false) {
  if (isMissing(value)) return null;
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) && (!integer || Number.isInteger(parsed)) ? parsed : NaN;
}
function validPressure(value) {
  if (typeof value !== 'string' || !/^\d{1,3}\s*\/\s*\d{1,3}$/.test(value.trim())) return false;
  const [systolic, diastolic] = value.split('/').map(Number);
  return systolic > 0 && diastolic > 0 && systolic > diastolic;
}
function validateVitals(input) {
  for (const key of ['frecuencia_cardiaca', 'frecuencia_respiratoria', 'saturacion_oxigeno', 'temperatura', 'peso']) {
    const value = input[key];
    if (isMissing(value)) continue;
    const integer = ['frecuencia_cardiaca', 'frecuencia_respiratoria', 'saturacion_oxigeno'].includes(key);
    const parsed = parseNumber(value, integer);
    if (!Number.isFinite(parsed) || parsed < 0) return `${SIGNS[key] || 'Peso'} debe ser un número ${integer ? 'entero ' : ''}no negativo.`;
    if (key === 'saturacion_oxigeno' && parsed > 100) return 'La saturación de oxígeno debe estar entre 0 y 100.';
    if (key === 'temperatura' && (parsed < 25 || parsed > 45)) return 'La temperatura registrada no es válida (25 a 45 °C).';
  }
  if (!isMissing(input.presion_arterial) && !validPressure(input.presion_arterial)) return 'Usa presión arterial sistólica/diastólica, por ejemplo 110/70, con sistólica mayor que diastólica.';
  return null;
}
function buildEvidence(input, historyCount = null) {
  const missing = [], invalid = [], available = [];
  for (const [field, label] of Object.entries(SIGNS)) {
    if (isMissing(input[field])) missing.push(label);
    else if (validateVitals({ [field]: input[field] })) invalid.push(label);
    else available.push(label);
  }
  return {
    estado_datos: invalid.length ? 'requiere_revision' : missing.length ? 'incompletos' : 'registrados',
    signos_registrados: available,
    datos_faltantes: missing,
    datos_invalidos: invalid,
    visitas_historicas_consultadas: historyCount,
    requiere_validacion_clinica: true,
    alcance: 'La disponibilidad de datos no confirma estabilidad ni valida la prioridad. Requiere valoración del personal clínico.',
  };
}
module.exports = { parseNumber, validateVitals, buildEvidence };
