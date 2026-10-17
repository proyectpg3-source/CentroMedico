const express = require('express');
const pool = require('../../config/db');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { logAuditEvent } = require('../../services/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));
const defaults = { centerName: 'Centro Médico La Aurora', rut: '', address: '', phone: '', email: '', website: '', timezone: 'America/Guatemala', language: 'Español (Latinoamérica)' };
const limits = { centerName: 120, rut: 60, address: 300, phone: 40, email: 254, website: 300, timezone: 80, language: 40 };

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('Envía los datos completos del centro.'), { status: 400 });
  if (Object.keys(body).some(key => !Object.hasOwn(defaults, key))) throw Object.assign(new Error('La configuración contiene campos no permitidos.'), { status: 400 });
  const data = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || body[key].trim().length > limit) throw Object.assign(new Error('Revisa el campo ' + key + '.'), { status: 400 });
    data[key] = body[key].trim();
  }
  if (!data.centerName) throw Object.assign(new Error('El nombre del centro es obligatorio.'), { status: 400 });
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw Object.assign(new Error('El correo institucional no es válido.'), { status: 400 });
  if (data.website) {
    try {
      const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(data.website) ? data.website : 'https://' + data.website);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error();
    } catch { throw Object.assign(new Error('El sitio web debe ser una dirección HTTP o HTTPS válida.'), { status: 400 }); }
  }
  try { new Intl.DateTimeFormat('es-GT', { timeZone: data.timezone }).format(); }
  catch { throw Object.assign(new Error('La zona horaria no es válida.'), { status: 400 }); }
  if (!['Español (Latinoamérica)', 'English (US)'].includes(data.language)) throw Object.assign(new Error('Selecciona un idioma disponible.'), { status: 400 });
  return data;
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT datos FROM configuracion_centro WHERE id = 1');
    res.json({ ...defaults, ...(result.rows[0]?.datos || {}) });
  } catch { res.status(500).json({ message: 'No se pudo cargar la configuración del centro.' }); }
});

router.put('/', async (req, res) => {
  try {
    const data = validate(req.body);
    const result = await pool.query(`INSERT INTO configuracion_centro (id, datos, updated_at)
      VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id)
      DO UPDATE SET datos = EXCLUDED.datos, updated_at = NOW() RETURNING datos`, [JSON.stringify(data)]);
    await logAuditEvent({ usuario: req.usuario, accion: 'configuracion.actualizada', entidad: 'configuracion_centro', idEntidad: 1, descripcion: 'Actualizó los datos generales del centro.' });
    res.json(result.rows[0].datos);
  } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo guardar la configuración del centro.' }); }
});

module.exports = router;
