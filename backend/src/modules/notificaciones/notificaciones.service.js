const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

const TYPES = {
  paciente_bienvenida: ['admin', 'recepcionista', 'enfermero'],
  usuario_bienvenida: ['admin'],
  cita_confirmacion: ['admin', 'recepcionista', 'enfermero'],
  cita_reprogramacion: ['admin', 'recepcionista', 'enfermero'],
  estado_cuenta: ['admin', 'recepcionista'],
};
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function authorize(kind, user) {
  if (!TYPES[kind]?.includes(user?.rol)) throw fail('No tienes permiso para enviar este aviso.', 403);
}
function publicUrl(name) {
  const value = process.env[name];
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    return url.href.replace(/\/$/, '');
  } catch { throw fail(`Configura ${name} con una dirección HTTPS pública válida.`, 503); }
}
function configured() {
  const from = String(process.env.EMAIL_FROM || '').trim();
  const address = from.match(/<([^<>]+)>$/)?.[1] || from;
  return process.env.EMAIL_ENABLED === 'true' && !!process.env.RESEND_API_KEY && validEmail(address) && !/[\r\n]/.test(from);
}
function safe(row) {
  return { id: row.id, tipo: row.tipo, entidad_id: row.entidad_id, destinatario: row.destinatario,
    estado: row.estado, error_codigo: row.error_codigo, proveedor_id: row.proveedor_id,
    created_at: row.created_at, updated_at: row.updated_at };
}
function createService(db = pool, transport = (...args) => fetch(...args)) {
  async function prepare(kind, id, user) {
    authorize(kind, user);
    if (!Number.isSafeInteger(id) || id <= 0) throw fail('Selecciona un registro válido.');
    let person, appointment;
    if (kind.startsWith('cita_')) {
      const r = await db.query(`SELECT c.id_cita, c.id_paciente, c.fecha_hora, c.estado, p.nombre, p.email
        FROM citas c JOIN pacientes p ON p.id_paciente=c.id_paciente WHERE c.id_cita=$1`, [id]);
      appointment = r.rows[0]; person = appointment;
      if (appointment && ['cancelada', 'completada'].includes(appointment.estado)) throw fail('No se envían avisos de citas canceladas o completadas.');
    } else if (kind === 'usuario_bienvenida') {
      const r = await db.query('SELECT nombre, email, activo FROM usuarios WHERE id_usuario=$1', [id]);
      person = r.rows[0];
      if (person && !person.activo) throw fail('La cuenta está desactivada.');
    } else {
      const r = await db.query('SELECT nombre, email FROM pacientes WHERE id_paciente=$1', [id]); person = r.rows[0];
    }
    if (!person) throw fail('Registro no encontrado.', 404);
    const email = String(person.email || '').trim().toLowerCase();
    if (!validEmail(email)) throw fail('El registro no tiene un correo válido. Corrígelo antes de notificar.');
    const centerRow = await db.query('SELECT datos FROM configuracion_centro WHERE id=1');
    const center = { centerName: 'Centro Médico La Aurora', timezone: 'America/Guatemala', ...(centerRow.rows[0]?.datos || {}) };
    const contact = [center.address, center.phone, center.email].filter(Boolean).join(' · ');
    let subject, text;
    if (kind === 'usuario_bienvenida') {
      subject = 'Tu cuenta del centro médico está registrada';
      text = `Hola ${person.nombre}.\nTu cuenta del personal ha sido registrada en ${center.centerName}.\nAccede en ${publicUrl('APP_URL')}.\nSolicita tus instrucciones de acceso al administrador por el canal autorizado. Nunca enviamos contraseñas por correo.`;
    } else if (kind === 'paciente_bienvenida') {
      subject = 'Confirmación de registro';
      text = `Hola ${person.nombre}.\nTu registro en ${center.centerName} se completó. Este aviso no crea una cuenta de acceso al sistema.`;
    } else if (appointment) {
      subject = kind === 'cita_reprogramacion' ? 'Actualización del horario de tu cita' : 'Confirmación de tu cita';
      const date = new Intl.DateTimeFormat('es-GT', { dateStyle: 'full', timeStyle: 'short', timeZone: center.timezone }).format(new Date(appointment.fecha_hora));
      text = `Hola ${person.nombre}.\n${subject} en ${center.centerName}: ${date} (${center.timezone}).\nPara cambios, comunícate con el centro.`;
    } else {
      subject = 'Estado de cuenta disponible';
      text = `Hola ${person.nombre}.\nTu estado de cuenta de ${center.centerName} está disponible. El enlace de consulta caduca en 24 horas. No compartas este enlace.`;
      publicUrl('PUBLIC_API_URL');
      if (!process.env.JWT_SECRET) throw fail('Falta configuración del enlace seguro.', 503);
    }
    return { kind, id, email, subject, text: `${text}\n\n${contact}\n${center.centerName}`,
      version: appointment ? `${new Date(appointment.fecha_hora).toISOString()}/${appointment.estado}` : kind === 'estado_cuenta' ? new Date().toISOString().slice(0, 10) : 'registro' };
  }
  async function deliver(row, user) {
    authorize(row.tipo, user);
    if (user.rol !== 'admin' && row.id_usuario !== user.id_usuario) throw fail('No tienes permiso para reintentar este aviso.', 403);
    if (row.estado === 'aceptado') return safe(row);
    if (!configured()) return { ...safe(row), aviso: 'Correo pendiente: el administrador debe configurar Resend en el servidor.' };
    // Resend conserva las claves 24 h. Fuera de 23 h no se reintenta una entrega dudosa.
    if (row.primer_intento && Date.now() - new Date(row.primer_intento).getTime() > 23 * 3600000) {
      throw fail('El plazo seguro de reintento terminó. Revisa el envío en Resend antes de cualquier nuevo aviso.', 409);
    }
    const claim = await db.query(`UPDATE notificaciones_correo SET estado='enviando',
      mensaje=CASE WHEN primer_intento IS NULL THEN jsonb_set(mensaje,'{from}',to_jsonb($2::text)) ELSE mensaje END,
      primer_intento=COALESCE(primer_intento,NOW()), ultimo_intento=NOW(), updated_at=NOW()
      WHERE id=$1 AND (estado IN ('pendiente','fallido','desconocido') OR
        (estado='enviando' AND ultimo_intento < NOW()-INTERVAL '1 minute')) RETURNING *`, [row.id, process.env.EMAIL_FROM.trim()]);
    if (!claim.rows[0]) {
      const current = await db.query('SELECT * FROM notificaciones_correo WHERE id=$1', [row.id]);
      return safe(current.rows[0]);
    }
    row = claim.rows[0];
    let state = 'desconocido', code = 'RESPUESTA_NO_CONFIRMADA', provider = null;
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json', 'Idempotency-Key': `centro-${row.id}` },
        body: JSON.stringify(row.mensaje), signal: AbortSignal.timeout(10000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && typeof body.id === 'string' && body.id) { state = 'aceptado'; code = null; provider = body.id; }
      else if (!response.ok) { state = response.status >= 500 ? 'desconocido' : 'fallido'; code = `PROVEEDOR_HTTP_${response.status}`; }
    } catch { /* Un timeout no demuestra que el proveedor haya rechazado el correo. */ }
    const saved = await db.query(`UPDATE notificaciones_correo SET estado=$2, error_codigo=$3,
      proveedor_id=COALESCE($4,proveedor_id), updated_at=NOW() WHERE id=$1 RETURNING *`, [row.id, state, code, provider]);
    return safe(saved.rows[0]);
  }
  async function send(input, user) {
    const prepared = await prepare(input.tipo, input.entidad_id, user);
    if (input.destinatario_confirmado !== true || input.email_confirmado !== prepared.email) {
      throw fail('Confirma el correo actual y la autorización del destinatario antes de enviar.');
    }
    const eventKey = crypto.createHash('sha256').update(JSON.stringify([prepared.kind, prepared.id, prepared.email, prepared.version])).digest('hex');
    const id = crypto.randomUUID();
    let text = prepared.text;
    if (input.tipo === 'estado_cuenta') {
      const token = jwt.sign({ purpose: 'estado-cuenta', paciente: input.entidad_id }, process.env.JWT_SECRET,
        { algorithm: 'HS256', audience: 'estado-cuenta', jwtid: id, expiresIn: '24h' });
      text += `\n\n${publicUrl('PUBLIC_API_URL')}/api/notificaciones/estado-cuenta/${token}`;
    }
    const message = { from: String(process.env.EMAIL_FROM || '').trim(), to: [prepared.email], subject: prepared.subject, text };
    // Una clave de evento única impide que dobles clics creen dos correos.
    await db.query(`INSERT INTO notificaciones_correo (id, evento_clave, tipo, entidad_id, destinatario, mensaje, id_usuario)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) ON CONFLICT (evento_clave) DO NOTHING`,
      [id, eventKey, input.tipo, input.entidad_id, prepared.email, JSON.stringify(message), user.id_usuario]);
    const result = await db.query('SELECT * FROM notificaciones_correo WHERE evento_clave=$1', [eventKey]);
    return deliver(result.rows[0], user);
  }
  async function retry(id, input, user) {
    const result = await db.query('SELECT * FROM notificaciones_correo WHERE id=$1', [id]);
    const row = result.rows[0]; if (!row) throw fail('Aviso no encontrado.', 404);
    authorize(row.tipo, user);
    const current = await prepare(row.tipo, row.entidad_id, user);
    if (input.destinatario_confirmado !== true || input.email_confirmado !== current.email || current.email !== row.destinatario) {
      throw fail('El destinatario cambió o no fue confirmado. Revisa el registro antes de enviar.', 409);
    }
    // El horario o estado cambió: no enviar una confirmación antigua.
    const key = crypto.createHash('sha256').update(JSON.stringify([current.kind, current.id, current.email, current.version])).digest('hex');
    if (key !== row.evento_clave) throw fail('El registro cambió; prepara un aviso actualizado.', 409);
    return deliver(row, user);
  }
  return { prepare, send, retry };
}
module.exports = { ...createService(), createService, configured, authorize, safe, TYPES, validEmail };
