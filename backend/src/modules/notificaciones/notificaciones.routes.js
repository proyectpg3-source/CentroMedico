const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../../config/db');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { parseEntityId } = require('../../utils/validators');
const { streamEstadoCuenta } = require('../cargos/estadoCuenta');
const { logAuditEvent } = require('../../services/audit');
const service = require('./notificaciones.service');
const handler = fn => async (req, res, next) => {
  try { await fn(req, res); }
  catch (error) {
    if (res.headersSent) return res.end();
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};
// Capacidad firmada, limitada exclusivamente al PDF del paciente y a 24 horas.
router.get('/estado-cuenta/:token', handler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  let payload;
  try { payload = jwt.verify(req.params.token, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'estado-cuenta' }); }
  catch { return res.status(401).json({ message: 'El enlace no es válido o ha vencido. Solicita un nuevo aviso al centro.' }); }
  if (payload.purpose !== 'estado-cuenta' || !Number.isSafeInteger(payload.paciente) || !payload.jti) return res.sendStatus(401);
  const record = await pool.query(`SELECT n.id FROM notificaciones_correo n JOIN pacientes p ON p.id_paciente=n.entidad_id
    WHERE n.id=$1 AND n.tipo='estado_cuenta' AND n.entidad_id=$2 AND LOWER(TRIM(p.email))=n.destinatario`, [payload.jti, payload.paciente]);
  if (!record.rows[0]) return res.status(401).json({ message: 'El enlace ya no está disponible.' });
  await logAuditEvent({ usuario: null, accion: 'correo.estado_cuenta_consultado', entidad: 'paciente', idEntidad: payload.paciente,
    descripcion: 'Consultó estado de cuenta mediante enlace temporal.' });
  const found = await streamEstadoCuenta(payload.paciente, 'enlace temporal autorizado', res);
  if (!found) res.sendStatus(404);
}));
router.use(requireAuth, requireRole('admin', 'recepcionista', 'enfermero'));
router.get('/estado', (req, res) => res.json({ configurado: service.configured(), proveedor: 'Resend',
  tipos: Object.keys(service.TYPES).filter(kind => service.TYPES[kind].includes(req.usuario.rol)) }));
router.get('/registros', handler(async (req, res) => {
  const kind = String(req.query.tipo || ''); service.authorize(kind, req.usuario);
  const q = String(req.query.q || '').trim().slice(0, 100);
  let sql;
  if (kind.startsWith('cita_')) sql = `SELECT c.id_cita AS id, p.nombre AS nombre, c.fecha_hora FROM citas c
    JOIN pacientes p ON p.id_paciente=c.id_paciente WHERE p.nombre ILIKE $1
    AND c.estado IN ('pendiente','confirmada','en_curso') ORDER BY c.fecha_hora DESC LIMIT 100`;
  else if (kind === 'usuario_bienvenida') sql = `SELECT id_usuario AS id, nombre FROM usuarios WHERE activo=true AND nombre ILIKE $1 ORDER BY nombre LIMIT 100`;
  else sql = `SELECT id_paciente AS id, nombre FROM pacientes WHERE nombre ILIKE $1 ORDER BY nombre LIMIT 100`;
  res.json((await pool.query(sql, [`%${q}%`])).rows);
}));
router.get('/preparar', handler(async (req, res) => {
  const id = parseEntityId(req.query.entidad_id);
  const prepared = await service.prepare(req.query.tipo, id, req.usuario);
  res.json({ destinatario: prepared.email, asunto: prepared.subject, texto: prepared.text });
}));
router.get('/', handler(async (req, res) => {
  const result = await pool.query(`SELECT * FROM notificaciones_correo WHERE ($1::boolean OR id_usuario=$2)
    ORDER BY created_at DESC LIMIT 100`, [req.usuario.rol === 'admin', req.usuario.id_usuario]);
  res.json(result.rows.map(service.safe));
}));
const sendLimiter = rateLimit({ windowMs: 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  keyGenerator: req => String(req.usuario.id_usuario), message: { message: 'Límite de 10 intentos por minuto. Espera antes de continuar.' } });
router.post('/', sendLimiter, handler(async (req, res) => {
  const input = { ...req.body, entidad_id: parseEntityId(req.body?.entidad_id) };
  const notice = await service.send(input, req.usuario);
  await logAuditEvent({ usuario: req.usuario, accion: 'correo.solicitado', entidad: 'correo',
    descripcion: 'Solicitó un aviso por correo.', metadata: { tipo: notice.tipo, estado: notice.estado } });
  res.json(notice);
}));
router.post('/:id/reintentar', sendLimiter, handler(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(400).json({ message: 'Aviso inválido.' });
  const notice = await service.retry(req.params.id, req.body || {}, req.usuario);
  await logAuditEvent({ usuario: req.usuario, accion: 'correo.reintentado', entidad: 'correo',
    descripcion: 'Reintentó un aviso por correo.', metadata: { tipo: notice.tipo, estado: notice.estado } });
  res.json(notice);
}));
module.exports = router;
