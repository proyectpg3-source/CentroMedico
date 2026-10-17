const router = require('express').Router();
const pool = require('../../config/db');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const { parseEntityId } = require('../../utils/validators');
router.use(requireAuth, requireRole('admin', 'medico', 'enfermero', 'recepcionista'));
const select = `SELECT a.*, 'AR-' || a.id::text AS codigo,
 u.nombre AS iniciado_nombre, p.nombre AS paciente_nombre
 FROM atenciones_rapidas a JOIN usuarios u ON u.id_usuario=a.iniciado_por
 LEFT JOIN pacientes p ON p.id_paciente=a.id_paciente`;
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseEntityId(req.query.page) || 1);
    const rows = await pool.query(`${select} ORDER BY a.created_at DESC, a.id DESC LIMIT 30 OFFSET $1`, [(page-1)*30]);
    res.json(rows.rows);
  } catch (e) { next(e); }
});
router.post('/', async (req, res, next) => {
  const { motivo, nombre_temporal, solicitud } = req.body || {};
  if (typeof motivo !== 'string' || !motivo.trim() || motivo.trim().length > 2000 ||
      (nombre_temporal != null && (typeof nombre_temporal !== 'string' || nombre_temporal.trim().length > 160)) ||
      typeof solicitud !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(solicitud)) {
    return res.status(400).json({ message: 'Indica un motivo válido (máximo 2000 caracteres) y una solicitud válida.' });
  }
  try {
    const result = await pool.query(`INSERT INTO atenciones_rapidas (solicitud,nombre_temporal,motivo,iniciado_por,actualizado_por)
      VALUES ($1,$2,$3,$4,$4) ON CONFLICT (solicitud) DO NOTHING RETURNING id`,
      [solicitud, nombre_temporal?.trim() || null, motivo.trim(), req.usuario.id_usuario]);
    const saved = await pool.query(`${select} WHERE a.solicitud=$1`, [solicitud]);
    const row = saved.rows[0];
    if (row.iniciado_por !== req.usuario.id_usuario || row.motivo !== motivo.trim() || row.nombre_temporal !== (nombre_temporal?.trim() || null))
      return res.status(409).json({ message: 'Esta solicitud ya se utilizó. Actualiza la lista antes de continuar.' });
    res.status(result.rowCount ? 201 : 200).json(row);
  } catch (e) { next(e); }
});
router.patch('/:id', async (req, res, next) => {
  const id = parseEntityId(req.params.id);
  const { estado, id_paciente } = req.body || {};
  if (!id || (!estado && id_paciente === undefined) ||
      (estado !== undefined && !['en_atencion','finalizada'].includes(estado)) ||
      (id_paciente !== undefined && !parseEntityId(id_paciente)))
    return res.status(400).json({ message: 'Cambio de atención inválido.' });
  if (estado && !['admin','medico','enfermero'].includes(req.usuario.rol))
    return res.status(403).json({ message: 'Solo el personal clínico puede iniciar o finalizar la atención.' });
  try {
    // La condición sobre el estado evita transiciones concurrentes y cambios de paciente posteriores.
    const result = await pool.query(`UPDATE atenciones_rapidas SET
      estado=COALESCE($2,estado), id_paciente=COALESCE($3,id_paciente), actualizado_por=$4, updated_at=NOW(),
      atendido_por=CASE WHEN $2='en_atencion' THEN $4 ELSE atendido_por END
      WHERE id=$1 AND ($2::text IS NULL OR ($2='en_atencion' AND estado='pendiente') OR ($2='finalizada' AND estado='en_atencion'))
      AND ($3::int IS NULL OR id_paciente IS NULL OR id_paciente=$3) RETURNING id`,
      [id, estado || null, id_paciente === undefined ? null : parseEntityId(id_paciente), req.usuario.id_usuario]);
    if (!result.rowCount) return res.status(409).json({ message: 'La atención cambió, ya está vinculada o no existe. Actualiza la lista.' });
    res.json((await pool.query(`${select} WHERE a.id=$1`, [id])).rows[0]);
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ message: 'El paciente seleccionado no existe.' });
    next(e);
  }
});
module.exports = router;
