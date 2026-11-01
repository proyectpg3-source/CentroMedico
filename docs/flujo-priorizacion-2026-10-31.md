# Flujo de priorización automática (31 de octubre de 2026)

Integra en este proyecto el registro SATS, las reglas P1–P4 y los indicadores de la
versión v2 (`centro-medico-la-aurora`), adaptados a las tablas `citas` y `triajes`.

## Flujo

| Paso | Pantalla | Qué ocurre |
|---|---|---|
| 1. Recepción | Recepción | El check-in registra la hora de llegada (`citas.hora_llegada`). Una visita presencial queda registrada al crearla. |
| 2. Evaluación de Enfermería | Evaluación de Enfermería | Signos vitales, movilidad, conciencia y trauma (TEWS) y revisión de los 24 discriminadores SATS con tres estados: Presente, Ausente y Sin evaluar. Un signo vital que no puede medirse se declara con su motivo. |
| 3. Motor de priorización | (automático al guardar) | Calcula una propuesta P1–P4 solo cuando los datos lo permiten. Sin datos suficientes **no propone** (antes proponía P4). |
| 4. Validación profesional | Validación profesional | Un médico (o administrador) confirma la propuesta o la modifica con justificación. Sin propuesta, clasifica manualmente con justificación. |
| 5. Cola médica | Cola médica | Ordena por prioridad validada y hora de ingreso a la cola. Permite llamar al paciente e iniciar la atención. |
| 6. Consulta médica | Consulta | Registra la información clínica; al guardar se finaliza la atención. |

## Reglas de seguridad

- Nunca se imputan valores normales a un signo vital faltante. El TEWS se calcula como intervalo.
- La propuesta nunca es la prioridad final. Solo una prioridad validada entra en la cola.
- Se exige justificación (mínimo 10 caracteres) al modificar la propuesta, al confirmar una propuesta provisional o con alertas de inconsistencia, y en toda clasificación manual. La base de datos lo verifica (`chk_triajes_validacion`).
- Si Enfermería actualiza una evaluación ya validada, la validación se anula y el paciente sale de la cola hasta volver a validarse.
- No se puede modificar la evaluación ni la prioridad cuando la consulta ya inició.
- Bitácora en `triajes_historial`: registro, actualización, validación, llamado e inicio de atención.

## Roles

| Acción | Roles |
|---|---|
| Registrar o actualizar la evaluación de Enfermería | admin, enfermero |
| Validar la prioridad | admin, medico |
| Llamar e iniciar atención desde la cola | admin, medico |
| Aprobar el conjunto de reglas | admin, medico |
| Ver indicadores | admin, medico, fundacion |
| Cargar línea base / anularla | admin y medico / solo admin |

## API nueva

- `GET /api/triajes/catalogo`: catálogo SATS (24 discriminadores y motivos de dato no obtenible).
- `POST /api/triajes/vista-previa`: propuesta sin guardar.
- `POST /api/triajes`: guarda la evaluación y la propuesta.
- `PATCH /api/triajes/validar`: `{ id_cita, prioridad_final, justificacion }`.
- `GET /api/triajes/cola`, `POST /api/triajes/cola/:id/llamar`, `POST /api/triajes/cola/:id/iniciar`.
- `GET /api/triajes/cita/:id/historial`.
- `GET /api/triajes/reglas`, `POST /api/triajes/reglas/aprobacion`.
- `GET /api/indicadores?desde&hasta`: comparación antes/después (U de Mann-Whitney).
- `GET|POST /api/indicadores/linea-base/lotes`, `POST /api/indicadores/linea-base/lotes/:id/anular`, `GET /api/indicadores/linea-base/plantilla`.

## Activación

No hay migraciones manuales: `schema.js` agrega las columnas y tablas al iniciar el backend
(idempotente). Las evaluaciones anteriores quedan como «registradas antes del registro SATS»;
`POST /api/analisis/priorizacion/recalcular` (admin) las recalcula con el motor nuevo sin tocar
prioridades ya validadas.

## Correcciones incluidas

- Crear citas fallaba con «El campo fecha es obligatorio»: la ruta pedía `fecha` y el frontend envía `fecha_hora`.
- `citas.hora_llegada` era `NOT NULL` pero la cita se crea sin llegada: ahora admite nulo y se registra en el check-in.
- La página de consulta no leía el id de la URL (`/consulta/:appointmentId`).
- La validación del frontend llamaba a `PATCH /api/triajes/validar`, que no existía.

## Pruebas

```bash
cd backend
npm install
npm test           # incluye test-flujo-motor.js (batería P1–P4: 20 casos)
npm run test:flujo # flujo completo con PostgreSQL embebido (PGlite)
```

## Integración en la arquitectura actual

Los motores se ejecutan dentro del backend Node.js. No se requiere un microservicio,
una llamada externa ni nuevas claves para triaje. Se conserva el módulo de correos
con Resend y su configuración vigente; no se incorporó el código Gmail del paquete.

- Recepción envía `registrar_llegada: true` al crear la visita presencial: cita y
  llegada se guardan juntas. Las citas programadas no registran llegada automáticamente.
- `PATCH /api/citas/:id/estado` permite gestionar llegada/cancelación de citas abiertas.
  Iniciar atención exige `POST /api/triajes/cola/:id/iniciar` y prioridad validada.
  La finalización se produce al guardar la visita en `POST /api/visitas`.
- La consulta muestra el triaje de esa cita y exige un costo explícito (0 para
  atención gratuita). Obtiene paciente y médico de la cita; no imprime recetas con nombres,
  dosis o duraciones inventados. Las recetas se registran desde el módulo correspondiente.
- La edición de recepción no permite cambiar el paciente tras registrar su triaje.
- El recálculo, la validación y el inicio de consulta bloquean primero la cita para
  mantener coherencia bajo concurrencia. El recálculo respeta las prioridades validadas.

## Alcance clínico y datos históricos

El conjunto importado es de SATS de adultos. La pantalla de reglas muestra su versión,
casos de prueba y aprobación profesional pendiente; superar pruebas de software no
certifica sus criterios clínicos. El personal responsable debe revisar y aprobar las
reglas para el uso previsto. El indicador P1 usa un parámetro local de cinco minutos,
pendiente de validación, mientras la cola muestra atención inmediata.

Se conservan los registros anteriores. Las horas de llegada que antes se generaban
por defecto no se reinterpretan ni se sustituyen por datos inventados: los indicadores
históricos requieren comprobar la calidad de esas marcas antes de compararlos.

## Verificación de la integración

- `npm test`: 12 suites aisladas, incluidas 84 comprobaciones del motor y sus entradas.
- `npm run test:flujo`: 58 comprobaciones con esquema y rutas reales en PGlite.
- `npm run test:postgres-isolated`: clúster PostgreSQL temporal independiente;
  incluye el flujo completo (60 comprobaciones), validación y recálculo concurrentes,
  consultas compartidas, pagos, atención rápida, resumen diario y correos simulados.
- `npm run build` en frontend: compilación de producción.

Las pruebas usan datos sintéticos. No envían correos reales ni escriben en la base
operativa del centro. Las columnas/tablas nuevas se crean al iniciar el backend
actualizado; no se necesita ejecutar SQL manualmente.
