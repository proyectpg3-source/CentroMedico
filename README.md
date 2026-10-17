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

## Microservicios

Se agregaron dos microservicios para la actividad:

- `microservices/triage-priority-service`: calcula prioridad clinica de triaje.
- `microservices/inventory-alerts-service`: calcula alertas de stock bajo y vencimiento para insumos de laboratorio.

El backend los consume con estas variables:

```env
TRIAGE_SERVICE_URL=http://localhost:4101
INVENTORY_ALERTS_SERVICE_URL=http://localhost:4102
```

Health desde el backend:

```bash
http://localhost:5000/api/microservices/health
```

Despliegue con Docker Compose:

```bash
docker compose -f docker-compose.microservices.yml up --build
```

Guia para grabar el video: `docs/microservices-video-guide.md`.

## Verificacion

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
