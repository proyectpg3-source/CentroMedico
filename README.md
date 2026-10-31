# Centro Medico La Aurora

Sistema web para gestionar pacientes, citas, triaje, historias clinicas,
laboratorio, prescripciones, pagos, reportes y priorizacion de atencion.

## Flujo clinico

1. Recepcion registra o localiza al paciente y crea la cita.
2. Enfermeria registra el triaje, antecedentes breves y signos vitales.
3. El sistema calcula una prioridad de apoyo que debe validar el personal clinico.
4. El medico registra la historia de la enfermedad, antecedentes, examen fisico,
   impresion, diagnostico, tratamiento, conducta y egreso o referencia.
5. Laboratorio, prescripciones y pagos quedan relacionados con la visita.

## Ejecutar

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Aplicacion: `http://localhost:5173`

## Arquitectura de ejecución

El sistema utiliza frontend React, backend Express organizado por módulos y PostgreSQL.
El backend calcula la prioridad de triaje y las alertas de inventario internamente,
sin llamadas a microservicios ni necesidad de desplegar servicios auxiliares.
La prioridad usa las reglas locales existentes y requiere revisión clínica.

`INVENTORY_EXPIRING_SOON_DAYS` configura el plazo de alertas de vencimiento (180 días por defecto).
Las antiguas variables `TRIAGE_SERVICE_URL`, `INVENTORY_ALERTS_SERVICE_URL` y
`MICROSERVICE_TIMEOUT_MS` ya no se utilizan; pueden retirarse del entorno de despliegue.
El endpoint `/api/microservices/health` se retiró; el estado del backend se consulta en `/api/health`.

Los directorios `microservices/` y su guía de video se conservan como material histórico
de la actividad anterior; no forman parte de la ejecución actual. Para Docker Compose
se utiliza `docker-compose.yml`, que inicia frontend, backend y PostgreSQL.

## Correos administrativos

Se implementó el módulo **Correos** con Resend: bienvenidas de personal/pacientes,
avisos de citas y acceso temporal al estado de cuenta. Los envíos se solicitan
después de guardar el registro y confirmar el destinatario; los fallos no duplican
ni eliminan personas. Requiere configurar el proveedor en el backend.
Consulta [activación, permisos y reintentos](docs/correo-resend.md).

Pruebas sin envíos reales: `npm run test:email` desde `backend`.

## Verificacion del sistema

```bash
cd backend
npm test
npm run test:clinical
npm run db:check
```

## Pruebas de seguridad para SQA

Desde `backend`, ejecutar `npm run test:security`. La prueba usa las rutas y la
autenticación reales con PostgreSQL y la inicialización del esquema sustituidos
por dobles estrictos. No modifica la base de datos real ni ejecuta migraciones.

La evidencia se guarda en `output/sqa/resultados_seguridad.json` y la entrega
incluye `output/sqa/informe_seguridad.md`. El proceso devuelve código 1 si hay
hallazgos pendientes; no debe interpretarse como una ejecución aprobada.

Esta comprobación local no sustituye pruebas de integración, auditoría de todas
las rutas ni revisión del entorno desplegado.

Regresiones aisladas de configuración y conversión de cita:

```bash
cd backend
npm run test:settings
npm run test:visit-conversion
```

Estas pruebas sustituyen PostgreSQL y la inicialización del esquema por dobles;
no usan datos reales. La configuración general se almacena en
`configuracion_centro`, incluida en respaldos con versión de esquema 3.
