require("dotenv").config({ quiet: true });

const pool = require("../db");
const { ensureSchema } = require("../schema");

async function main() {
  try {
    await ensureSchema(pool);

    const [counts, estados, estadosLaboratorio] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM pacientes) AS pacientes,
          (SELECT COUNT(*)::int FROM medicos) AS medicos,
          (SELECT COUNT(*)::int FROM citas) AS citas,
          (SELECT COUNT(*)::int FROM visitas_medicas) AS visitas,
          (SELECT COUNT(*)::int FROM ordenes_laboratorio) AS ordenes_laboratorio,
          (SELECT COUNT(*)::int FROM resultados_laboratorio) AS resultados_laboratorio,
          (SELECT COUNT(*)::int FROM prescripciones) AS prescripciones,
          (SELECT COUNT(*)::int FROM cargos_paciente) AS cargos,
          (SELECT COUNT(*)::int FROM pagos) AS pagos
      `),
      pool.query(`
        SELECT estado, COUNT(*)::int AS total
        FROM citas
        GROUP BY estado
        ORDER BY estado
      `),
      pool.query(`
        SELECT estado, COUNT(*)::int AS total
        FROM ordenes_laboratorio
        GROUP BY estado
        ORDER BY estado
      `),
    ]);

    console.log(
      JSON.stringify(
        {
          resumen: counts.rows[0],
          estados: estados.rows,
          estados_laboratorio: estadosLaboratorio.rows,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
