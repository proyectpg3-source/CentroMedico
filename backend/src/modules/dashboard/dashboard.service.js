const pool = require("../../config/db");

async function getResumen() {
  const [countsResult, estadosResult] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM pacientes) AS total_pacientes,
        (SELECT COUNT(*)::int FROM medicos) AS total_medicos,
        (SELECT COUNT(*)::int FROM citas) AS total_citas,
        (SELECT COUNT(*)::int FROM visitas_medicas) AS total_visitas,
        (SELECT COUNT(*)::int FROM ordenes_laboratorio) AS total_ordenes_laboratorio,
        (SELECT COUNT(*)::int FROM prescripciones) AS total_prescripciones,
        (SELECT COUNT(*)::int FROM cargos_paciente) AS total_cargos
    `),
    pool.query(`
      SELECT estado, COUNT(*)::int AS total
      FROM citas
      GROUP BY estado
      ORDER BY estado
    `),
  ]);

  return {
    ...countsResult.rows[0],
    citas_por_estado: estadosResult.rows,
  };
}

module.exports = { getResumen };
