/*
 * CENTRO MÉDICO LA AURORA
 *
 * LECTURA Y VALIDACIÓN DE HOJAS DE OBSERVACIÓN
 * (LÍNEA BASE, PERIODO ANTERIOR AL SISTEMA)
 *
 * Acepta CSV exportado desde Excel (separador ; o ,
 * o tabulador; fechas AAAA-MM-DD o DD/MM/AAAA;
 * horas HH:MM, HH:MM:SS o con a. m./p. m.) o filas
 * capturadas en pantalla con los mismos campos.
 *
 * Valida cada fila y devuelve TODOS los errores
 * con su número de fila, para corregir el archivo
 * de una sola vez. No guarda nada.
 */

const COLUMNS = Object.freeze([
  { campo: 'codigo_hoja', requerido: false, descripcion: 'Código de la hoja o del paciente observado (sin nombres). Máx. 30 caracteres.' },
  { campo: 'fecha', requerido: true, descripcion: 'Fecha de la observación: AAAA-MM-DD o DD/MM/AAAA.' },
  { campo: 'hora_llegada', requerido: true, descripcion: 'Hora de llegada al centro (HH:MM, 24 h o con a. m./p. m.).' },
  { campo: 'hora_valoracion', requerido: false, descripcion: 'Hora en que inició la valoración inicial o triaje.' },
  { campo: 'hora_inicio_consulta', requerido: false, descripcion: 'Hora en que inició la consulta médica.' },
  { campo: 'hora_fin_consulta', requerido: false, descripcion: 'Hora en que terminó la consulta médica.' },
  { campo: 'prioridad', requerido: false, descripcion: 'Prioridad asignada en ese momento, si existía: P1-P4, 1-4 o rojo/naranja/amarillo/verde.' },
  { campo: 'observacion', requerido: false, descripcion: 'Nota breve sin datos personales. Máx. 300 caracteres.' },
]);

const MAX_ROWS = 5000;

const PRIORITY_ALIASES = Object.freeze({
  P1: 'P1', 1: 'P1', ROJO: 'P1',
  P2: 'P2', 2: 'P2', NARANJA: 'P2',
  P3: 'P3', 3: 'P3', AMARILLO: 'P3',
  P4: 'P4', 4: 'P4', VERDE: 'P4',
});

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^﻿/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function detectDelimiter(headerLine) {
  const counts = [';', ',', '\t'].map((d) => [d, headerLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ';';
}

/* CSV con comillas dobles (RFC 4180). */
function parseCsv(text) {
  const source = String(text ?? '').replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return { delimiter, rows };
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  let y;
  let m;
  let d;

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    [, y, m, d] = match.map(Number);
  } else {
    match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if (!match) return null;
    [, d, m, y] = match.map(Number);
  }

  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    y < 2000
  ) {
    return null;
  }

  return { y, m, d };
}

function parseTime(value) {
  let text = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '');

  if (!text) return undefined;

  let meridiem = null;
  const suffix = /\s?(am|pm|a m|p m)$/.exec(text);
  if (suffix) {
    meridiem = suffix[1].replace(' ', '');
    text = text.slice(0, suffix.index).trim();
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  }

  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return { hours, minutes, seconds };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toTimestamp(date, time) {
  return `${date.y}-${pad(date.m)}-${pad(date.d)} ${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
}

function toMillis(date, time) {
  return new Date(date.y, date.m - 1, date.d, time.hours, time.minutes, time.seconds).getTime();
}

/*
 * Valida un objeto fila con los campos de COLUMNS.
 * rowNumber es la fila del archivo (encabezado = 1).
 */
function validateRow(raw, rowNumber, today = new Date()) {
  const errors = [];
  const add = (campo, mensaje) => errors.push({ fila: rowNumber, campo, mensaje });

  const text = (key) => String(raw?.[key] ?? '').trim();

  const date = parseDate(text('fecha'));
  if (!text('fecha')) add('fecha', 'La fecha es obligatoria.');
  else if (!date) add('fecha', 'Fecha inválida. Use AAAA-MM-DD o DD/MM/AAAA.');

  const times = {};
  for (const key of ['hora_llegada', 'hora_valoracion', 'hora_inicio_consulta', 'hora_fin_consulta']) {
    const parsed = parseTime(text(key));
    if (parsed === null) add(key, 'Hora inválida. Use HH:MM (24 h) o HH:MM a. m./p. m.');
    else times[key] = parsed;
  }

  if (!text('hora_llegada')) add('hora_llegada', 'La hora de llegada es obligatoria.');

  if (date) {
    const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (new Date(date.y, date.m - 1, date.d).getTime() > limit) {
      add('fecha', 'La fecha no puede ser futura.');
    }
  }

  const ms = {};
  if (date) {
    for (const [key, value] of Object.entries(times)) {
      if (value) ms[key] = toMillis(date, value);
    }
  }

  if (ms.hora_llegada !== undefined) {
    if (ms.hora_valoracion !== undefined && ms.hora_valoracion < ms.hora_llegada) {
      add('hora_valoracion', 'La valoración no puede ser anterior a la llegada (si cruzó la medianoche, registre la fila por separado).');
    }
    if (ms.hora_inicio_consulta !== undefined && ms.hora_inicio_consulta < ms.hora_llegada) {
      add('hora_inicio_consulta', 'La consulta no puede iniciar antes de la llegada.');
    }
  }
  if (
    ms.hora_inicio_consulta !== undefined &&
    ms.hora_valoracion !== undefined &&
    ms.hora_inicio_consulta < ms.hora_valoracion
  ) {
    add('hora_inicio_consulta', 'La consulta no puede iniciar antes de la valoración.');
  }
  if (ms.hora_fin_consulta !== undefined) {
    if (ms.hora_inicio_consulta === undefined) {
      add('hora_fin_consulta', 'Registre la hora de inicio de la consulta si registra la de fin.');
    } else if (ms.hora_fin_consulta < ms.hora_inicio_consulta) {
      add('hora_fin_consulta', 'El fin de la consulta no puede ser anterior a su inicio.');
    }
  }

  let priority = null;
  const rawPriority = text('prioridad').toUpperCase();
  if (rawPriority) {
    priority = PRIORITY_ALIASES[rawPriority] ?? null;
    if (!priority) add('prioridad', 'Prioridad inválida. Use P1-P4, 1-4 o rojo/naranja/amarillo/verde.');
  }

  const sheet = text('codigo_hoja');
  if (sheet.length > 30) add('codigo_hoja', 'El código de hoja no puede superar 30 caracteres.');

  const note = text('observacion');
  if (note.length > 300) add('observacion', 'La observación no puede superar 300 caracteres.');

  if (errors.length > 0) return { errores: errors, registro: null };

  const stamp = (key) => (times[key] ? toTimestamp(date, times[key]) : null);

  return {
    errores: [],
    registro: {
      fila_origen: rowNumber,
      codigo_hoja: sheet || null,
      fecha_llegada: stamp('hora_llegada'),
      fecha_valoracion: stamp('hora_valoracion'),
      fecha_inicio_consulta: stamp('hora_inicio_consulta'),
      fecha_fin_consulta: stamp('hora_fin_consulta'),
      prioridad: priority,
      observacion: note || null,
    },
  };
}

function validateRows(objects, { firstRowNumber = 2, today } = {}) {
  const errors = [];
  const records = [];

  if (!Array.isArray(objects) || objects.length === 0) {
    return { registros: [], errores: [{ fila: null, campo: null, mensaje: 'No hay filas para registrar.' }] };
  }

  if (objects.length > MAX_ROWS) {
    return {
      registros: [],
      errores: [{ fila: null, campo: null, mensaje: `Un lote admite como máximo ${MAX_ROWS} filas.` }],
    };
  }

  const seen = new Map();

  objects.forEach((raw, index) => {
    const rowNumber = raw?.__fila ?? firstRowNumber + index;
    const result = validateRow(raw, rowNumber, today);
    errors.push(...result.errores);

    /*
     * El código repetido el mismo día se detecta
     * aunque la otra fila tenga errores.
     */
    const sheet = String(raw?.codigo_hoja ?? '').trim();
    const date = parseDate(String(raw?.fecha ?? '').trim());

    if (sheet && date) {
      const key = `${date.y}-${date.m}-${date.d}|${sheet.toUpperCase()}`;
      if (seen.has(key)) {
        errors.push({
          fila: rowNumber,
          campo: 'codigo_hoja',
          mensaje: `Código de hoja repetido el mismo día (también en la fila ${seen.get(key)}).`,
        });
        return;
      }
      seen.set(key, rowNumber);
    }

    if (result.registro) records.push(result.registro);
  });

  return { registros: errors.length ? [] : records, errores: errors };
}

/*
 * CSV → objetos fila y validación completa.
 */
function parseObservationCsv(text, options = {}) {
  const { delimiter, rows } = parseCsv(text);
  const nonEmpty = rows
    .map((cells, index) => ({ cells, line: index + 1 }))
    .filter(({ cells }) => cells.some((c) => String(c).trim() !== ''));

  if (nonEmpty.length === 0) {
    return { separador: delimiter, registros: [], errores: [{ fila: null, campo: null, mensaje: 'El archivo está vacío.' }] };
  }

  const header = nonEmpty[0].cells.map(normalizeHeader);
  const known = COLUMNS.map((c) => c.campo);
  const missing = COLUMNS.filter((c) => c.requerido && !header.includes(c.campo)).map((c) => c.campo);
  const unknown = header.filter((h) => h && !known.includes(h));

  if (missing.length > 0 || unknown.length > 0) {
    const errors = [];
    if (missing.length) errors.push({ fila: 1, campo: null, mensaje: `Faltan columnas obligatorias: ${missing.join(', ')}.` });
    if (unknown.length) errors.push({ fila: 1, campo: null, mensaje: `Columnas no reconocidas: ${unknown.join(', ')}. Use la plantilla.` });
    return { separador: delimiter, registros: [], errores: errors };
  }

  const objects = nonEmpty.slice(1).map(({ cells, line }) => {
    const obj = { __fila: line };
    header.forEach((name, i) => {
      if (name) obj[name] = cells[i] ?? '';
    });
    return obj;
  });

  return { separador: delimiter, ...validateRows(objects, options) };
}

function buildTemplateCsv() {
  const header = COLUMNS.map((c) => c.campo).join(';');
  const example = ['H-001', '15/03/2026', '08:05', '08:40', '09:30', '09:45', 'P3', 'Ejemplo: borre esta fila'].join(';');
  return `﻿${header}\r\n${example}\r\n`;
}

module.exports = {
  COLUMNS,
  MAX_ROWS,
  parseCsv,
  parseDate,
  parseTime,
  validateRow,
  validateRows,
  parseObservationCsv,
  buildTemplateCsv,
};
