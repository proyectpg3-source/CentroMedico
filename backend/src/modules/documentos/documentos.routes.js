const express = require('express');
const pool = require('../../config/db');
const { requireAuth, requireRole } = require('../../middlewares/auth.middleware');
const router = express.Router();
router.use(requireAuth, requireRole('admin','medico','enfermero'));
const allowed = new Set(['application/pdf','image/png','image/jpeg','text/plain']);
router.get('/', async (req,res,next) => {
  try {
    res.json((await pool.query(`SELECT d.id,d.id_paciente,d.nombre,d.descripcion,d.tipo,d.created_at,octet_length(d.contenido) AS bytes,p.nombre AS paciente
      FROM documentos_paciente d JOIN pacientes p ON p.id_paciente=d.id_paciente ORDER BY d.id DESC`)).rows);
  } catch(e) { next(e); }
});
router.post('/', async (req,res,next) => {
  try {
    const b=req.body;
    if (!Number.isSafeInteger(Number(b.id_paciente)) || Number(b.id_paciente)<=0 || typeof b.nombre!=='string' || !b.nombre.trim() || b.nombre.length>200 || !allowed.has(b.tipo) || typeof b.contenido!=='string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(b.contenido)) return res.status(400).json({message:'Paciente, nombre y archivo válido son obligatorios.'});
    const content=Buffer.from(b.contenido,'base64');
    if (!content.length || content.length>5*1024*1024) return res.status(400).json({message:'El archivo debe tener contenido y pesar hasta 5 MB.'});
    const result=await pool.query(`INSERT INTO documentos_paciente (id_paciente,nombre,descripcion,tipo,contenido,id_usuario) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,[Number(b.id_paciente),b.nombre.trim(),typeof b.descripcion==='string'?b.descripcion.trim():'',b.tipo,content,req.usuario.id_usuario]);
    res.status(201).json(result.rows[0]);
  } catch(e) {
    if(e.code==='23503') return res.status(400).json({message:'El paciente no existe.'});
    next(e);
  }
});
router.get('/:id', async (req,res,next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({message:'ID inválido.'});
    const d=(await pool.query('SELECT nombre,tipo,contenido FROM documentos_paciente WHERE id=$1',[req.params.id])).rows[0];
    if (!d) return res.status(404).json({message:'Documento no encontrado.'});
    res.json({nombre:d.nombre,tipo:d.tipo,contenido:d.contenido.toString('base64')});
  } catch(e) { next(e); }
});
router.delete('/:id', requireRole('admin'), async (req,res,next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({message:'ID inválido.'});
    const result=await pool.query('DELETE FROM documentos_paciente WHERE id=$1 RETURNING id',[req.params.id]);
    if (!result.rowCount) return res.status(404).json({message:'Documento no encontrado.'});
    res.json({deleted:true});
  } catch(e) { next(e); }
});
module.exports=router;
