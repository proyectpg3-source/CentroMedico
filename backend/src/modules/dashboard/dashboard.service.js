const pool = require("../../config/db");

async function getResumen() {
  const [countsResult, estadosResult, tendenciaResult, operationalResult, financialResult] = await Promise.all([
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
      GROUP BY m.mes ORDER by m.mes
    `),
    pool.query(`
      SELECT
        COALESCE((SELECT COUNT(*)::float FROM visitas_medicas) /
        NULLIF((SELECT COUNT(*)::float FROM citas), 0) * 100, 0) as tasa_conversion,

        COALESCE(AVG(EXTRACT(EPOCH FROM (v.fecha_visita - t.fecha_triaje)) / 3600), 0)::float as tiempo_espera_promedio_horas
      FROM visitas_medicas v
      JOIN triajes t ON v.id_cita = t.id_cita
    `),
    pool.query(`
      SELECT
        COALESCE((SELECT SUM(monto) FROM pagos), 0)::float as recaudado,
        COALESCE((SELECT SUM(saldo) FROM cargos_paciente), 0)::float as pendiente,
        COALESCE((SELECT COUNT(*)::int FROM cargos_paciente WHERE saldo > 0), 0) as cargos_pendientes
    `)
  ]);

  const financialData = financialResult.rows[0] || { recaudado: 0, pendiente: 0, cargos_pendientes: 0 };
  const recaudado = financialData.recaudado || 0;
  const pendiente = financialData.pendiente || 0;
 const indiceCobrabilidad = (recaudado / NULLIF(recaudado + pendiente, 0)) * 100;


  return {
    ...countsResult.rows[0],
    citas_por_estado: estadosResult.rows,
    citas_por_mes: tendenciaResult.rows,
    operativa: operationalResult.rows[0] || { tasa_conversion: 0, tiempo_espera_promedio_horas: 0 },
    financiera: {
      recaudado,
      pendiente,
      indiceCobrabilidad: isNaN(indiceCobrabilidad) ? 0 : indiceCobrabilidad,
      cargos_pendientes: financialData.cargos_pendientes || 0,
    },
  };
}

module.exports = { getResumen };
