const express = require('express');
const pool = require('../../config/db');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const router = express.Router();
// Medicos solo consultan el catalogo para vincular prescripciones; las escrituras exigen admin/enfermero.
router.use(requireAuth, requireRole('admin', 'enfermero', 'fundacion', 'medico'));

function fail(message, status = 400) { return Object.assign(new Error(message), { status }); }
function integer(value, minimum = 0) {
  if (value === '' || value === null || typeof value === 'boolean') throw fail('Ingresa una cantidad válida.');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < minimum || n > 2147483647) throw fail('Ingresa una cantidad entera válida.');
  return n;
}
function text(value) { return typeof value === 'string' ? value.trim() : ''; }
function handle(error, res) {
  if (error.code === '23505') return res.status(409).json({ message: 'Ese código ya existe.' });
  res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo guardar la operación.' });
}

router.get('/', async (req, res) => {
  try {
    if (!['inventario','farmacia'].includes(req.query.tipo)) throw fail('Tipo de inventario inválido.');
    const result = await pool.query("SELECT *, precio::float8, to_char(vencimiento,'YYYY-MM-DD') AS vencimiento FROM productos WHERE tipo=$1 ORDER BY nombre,id", [req.query.tipo]);
    res.json(result.rows);
  } catch (e) { handle(e, res); }
});

router.post('/', requireRole('admin', 'enfermero'), async (req, res) => {
  const client = await pool.connect();
  try {
    const b = req.body;
    if (!['inventario','farmacia'].includes(b.tipo) || !text(b.nombre) || !text(b.codigo) || !text(b.categoria) || !text(b.unidad)) throw fail('Completa código, nombre, categoría y unidad.');
    const stock = integer(b.stock), minimo = integer(b.minimo);
    const precio = Number(b.precio);
    if (!Number.isFinite(precio) || precio < 0 || precio > 9999999999.99) throw fail('Precio inválido.');
    if (b.vencimiento && (!/^\d{4}-\d{2}-\d{2}$/.test(b.vencimiento) || Number.isNaN(Date.parse(b.vencimiento)))) throw fail('Fecha inválida.');
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO productos (tipo,codigo,nombre,categoria,unidad,proveedor,stock,minimo,precio,vencimiento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.tipo,text(b.codigo),text(b.nombre),text(b.categoria),text(b.unidad),text(b.proveedor),stock,minimo,precio,b.vencimiento || null]);
    if (stock) await client.query('INSERT INTO movimientos_productos (id_producto,cantidad,motivo,id_usuario) VALUES ($1,$2,$3,$4)', [result.rows[0].id,stock,'Existencia inicial',req.usuario.id_usuario]);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); handle(e,res); }
  finally { client.release(); }
});

router.get('/:id/movimientos', async (req,res) => {
  try {
    const id = integer(req.params.id,1);
    res.json((await pool.query(`SELECT m.*,u.nombre AS usuario FROM movimientos_productos m LEFT JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE id_producto=$1 ORDER BY m.id DESC`,[id])).rows);
  } catch(e) { handle(e,res); }
});

router.post('/:id/movimientos', requireRole('admin','enfermero'), async (req,res) => {
  const client = await pool.connect();
  try {
    const id=integer(req.params.id,1), amount=integer(req.body.cantidad,1);
    if (!['entrada','salida'].includes(req.body.tipo) || !text(req.body.motivo)) throw fail('Indica tipo y motivo del movimiento.');
    const delta=req.body.tipo==='salida' ? -amount : amount;
    await client.query('BEGIN');
    const item=(await client.query('SELECT *, vencimiento < CURRENT_DATE AS vencido FROM productos WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if (!item) throw fail('Producto no encontrado.',404);
    if (delta < 0 && item.vencido) throw fail('No se puede dar salida a un producto vencido.');
    if (item.stock+delta < 0) throw fail('Existencias insuficientes.',409);
    await client.query('UPDATE productos SET stock=stock+$1 WHERE id=$2',[delta,id]);
    await client.query('INSERT INTO movimientos_productos (id_producto,cantidad,motivo,id_usuario) VALUES ($1,$2,$3,$4)',[id,delta,text(req.body.motivo),req.usuario.id_usuario]);
    await client.query('COMMIT');
    res.status(201).json({ stock:item.stock+delta });
  } catch(e) { await client.query('ROLLBACK'); handle(e,res); }
  finally { client.release(); }
});
module.exports=router;
