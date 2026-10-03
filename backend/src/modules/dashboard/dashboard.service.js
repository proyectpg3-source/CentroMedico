const pool = require("../../config/db");

async function getResumen() {
  const [countsResult, estadosResult, tendenciaResult] = await Promise.all([
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
    pool.query(`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', NOW() AT TIME ZONE 'America/Guatemala') - INTERVAL '5 months',
          date_trunc('month', NOW() AT TIME ZONE 'America/Guatemala'),
          INTERVAL '1 month'
        ) AS mes
      )
      SELECT to_char(m.mes, 'YYYY-MM') AS mes, COUNT(c.id_cita)::int AS citas
      FROM meses m
      LEFT JOIN citas c ON c.fecha_hora >= m.mes AT TIME ZONE 'America/Guatemala'
        AND c.fecha_hora < (m.mes + INTERVAL '1 month') AT TIME ZONE 'America/Guatemala'
      GROUP BY m.mes ORDER BY m.mes
    `),
  ]);

  return {
    ...countsResult.rows[0],
    citas_por_estado: estadosResult.rows,
    citas_por_mes: tendenciaResult.rows,
  };
}

module.exports = { getResumen };
