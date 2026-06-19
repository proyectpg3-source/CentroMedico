require("dotenv").config({ quiet: true });

const app = require("../src/app");
const pool = require("../src/config/db");

let patientId = null;

async function cleanup() {
  if (!patientId) return;
  await pool.query("DELETE FROM pagos WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM cargos_paciente WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM visitas_medicas WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM citas WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM pacientes WHERE id_paciente=$1", [patientId]);
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const doctor = (
      await pool.query("SELECT id_medico FROM medicos ORDER BY id_medico LIMIT 1")
    ).rows[0];
    if (!doctor) throw new Error("Se necesita al menos un medico para la prueba.");

    const patient = await pool.query(
      `INSERT INTO pacientes (
         nombre,dni,telefono,fecha_nacimiento,sexo,residencia
       ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_paciente`,
      [
        "PRUEBA CODEX TEMPORAL",
        `TMP-${Date.now()}`,
        "00000000",
        "1990-01-01",
        "masculino",
        "Temporal",
      ]
    );
    patientId = patient.rows[0].id_paciente;

    const appointment = await pool.query(
      `INSERT INTO citas (id_paciente,id_medico,fecha_hora,motivo,estado)
       VALUES ($1,$2,NOW(),$3,'pendiente') RETURNING id_cita`,
      [patientId, doctor.id_medico, "Fiebre alta y dolor abdominal"]
    );
    const appointmentId = appointment.rows[0].id_cita;

    const triageResponse = await fetch(`${baseUrl}/api/triajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cita: appointmentId,
        motivo_consulta: "Fiebre alta y dolor abdominal",
        historia_enfermedad_actual: "Dos dias de evolucion",
        antecedentes_relevantes: "Sin antecedentes",
        presion_arterial: "110/70",
        frecuencia_cardiaca: 96,
        frecuencia_respiratoria: 22,
        temperatura: 39.1,
        saturacion_oxigeno: 96,
        peso: 70,
      }),
    });
    const triage = await triageResponse.json();
    if (!triageResponse.ok) throw new Error(JSON.stringify(triage));

    const visitResponse = await fetch(`${baseUrl}/api/visitas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cita: appointmentId,
        id_paciente: patientId,
        id_medico: doctor.id_medico,
        fecha_visita: new Date().toISOString(),
        motivo: "Fiebre alta y dolor abdominal",
        historia_enfermedad_actual: "Dos dias de evolucion",
        antecedentes_medicos: "Sin antecedentes",
        examen_fisico: "Paciente consciente y orientado",
        presion_arterial: "110/70",
        frecuencia_cardiaca: 96,
        frecuencia_respiratoria: 22,
        temperatura: 39.1,
        saturacion_oxigeno: 96,
        impresion_clinica: "Sindrome febril en estudio",
        diagnostico: "Diagnostico de prueba temporal",
        tratamiento: "Hidratacion",
        conducta: "Seguimiento ambulatorio",
        tipo_atencion: "ambulatorio",
        dieta: "Blanda",
        ordenes_especiales: "Control de signos vitales",
        diagnostico_egreso: "Estable",
        fecha_egreso: new Date().toISOString(),
        costo_consulta: 0,
      }),
    });
    const visit = await visitResponse.json();
    if (!visitResponse.ok) throw new Error(JSON.stringify(visit));

    console.log(
      JSON.stringify(
        {
          triaje: {
            id: triage.id_triaje,
            prioridad: triage.prioridad_clinica,
            puntaje: triage.puntaje_prioridad,
          },
          visita: {
            id: visit.id_visita,
            impresion: visit.impresion_clinica,
            tipo_atencion: visit.tipo_atencion,
          },
        },
        null,
        2
      )
    );
  } finally {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
