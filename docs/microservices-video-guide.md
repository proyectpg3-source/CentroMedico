# Guia para el video de microservicios

Proyecto usado para la entrega:

```text
C:\Users\eliazar\CentroMedico
```

## Microservicios implementados

1. `triage-priority-service`
   - Puerto local: `4101`
   - Endpoint principal: `POST /prioritize`
   - Funcion: recibe motivo de consulta, notas de triaje, edad y signos vitales; devuelve nivel de prioridad, puntaje y razones clinicas.
   - Integracion: el backend lo usa al simular o guardar prioridad clinica en triaje.

2. `inventory-alerts-service`
   - Puerto local: `4102`
   - Endpoint principal: `POST /alerts`
   - Funcion: recibe insumos de laboratorio; devuelve alertas de stock bajo, vencidos y proximos a vencer.
   - Integracion: el backend lo usa en `GET /api/laboratorio/insumos/alertas`.

## Flujo de arquitectura

La aplicacion React consume el backend principal en `http://localhost:5000`.
El backend mantiene autenticacion, PostgreSQL, reglas de permisos y datos clinicos.
Cuando necesita prioridad o alertas de inventario, llama a los microservicios mediante HTTP.
Si un microservicio no esta levantado, el backend usa un fallback local para no detener el sistema.

## Modulos adaptados del proyecto anterior

Ademas de los microservicios, se adaptaron ideas utiles de la otra carpeta del proyecto:

- Inventario de laboratorio: ahora vive dentro de `Laboratorio`, usando la tabla `insumos_laboratorio` y movimientos de entrada/salida.
- Backup administrativo: disponible en `Configuracion > Datos y Backup`, exporta un JSON con pacientes, citas, laboratorio, pagos, usuarios, auditoria e inventario.
- Auditoria: registra acciones administrativas como exportar backup, crear/editar insumos y movimientos de stock.

Estos modulos quedan integrados al backend actual con autenticacion por rol y al frontend React existente.

## Endpoints para mostrar

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000/api/health`
- Health de microservicios desde backend: `http://localhost:5000/api/microservices/health`
- Health directo de triaje: `http://localhost:4101/health`
- Health directo de inventario: `http://localhost:4102/health`
- Inventario en backend: `http://localhost:5000/api/laboratorio/insumos`
- Alertas de inventario: `http://localhost:5000/api/laboratorio/insumos/alertas`
- Backup administrativo: `http://localhost:5000/api/backups/export`
- Auditoria: `http://localhost:5000/api/auditoria`

## Comandos con Docker

Desde la raiz del proyecto:

```bash
cd "C:\Users\eliazar\CentroMedico"
docker compose -f docker-compose.microservices.yml up --build
```

Este comando levanta:

- `postgres`: base de datos PostgreSQL.
- `backend`: API principal en puerto `5000`.
- `frontend`: app React en puerto `5173`.
- `triage-priority-service`: microservicio de triaje en puerto `4101`.
- `inventory-alerts-service`: microservicio de alertas en puerto `4102`.

Nota: PostgreSQL dentro de Docker usa el puerto interno `5432`, pero en Windows queda publicado como `5433` para no chocar con un PostgreSQL local.

Para detener:

```bash
docker compose -f docker-compose.microservices.yml down
```

Para cargar datos de ejemplo dentro de Docker:

```bash
docker compose -f docker-compose.microservices.yml exec backend npm run db:seed
docker compose -f docker-compose.microservices.yml exec backend npm run auth:create-admin
```

Usuario de prueba:

```text
admin@centromedico.com
Admin1234!
```

## Pruebas locales sin Docker

Backend:

```bash
cd "C:\Users\eliazar\CentroMedico\backend"
npm test
```

Frontend:

```bash
cd "C:\Users\eliazar\CentroMedico\frontend"
npm run build
```

Microservicios:

```bash
cd "C:\Users\eliazar\CentroMedico\microservices\triage-priority-service"
npm test
```

```bash
cd "C:\Users\eliazar\CentroMedico\microservices\inventory-alerts-service"
npm test
```

## Guion sugerido

1. Presentar el proyecto: "Centro Medico La Aurora es una aplicacion para pacientes, citas, triaje, visitas medicas, laboratorio, pagos y reportes".
2. Explicar que agregaste dos microservicios: prioridad clinica de triaje y alertas de insumos de laboratorio.
3. Mostrar carpetas:
   - `microservices/triage-priority-service`
   - `microservices/inventory-alerts-service`
   - `backend/src/services/microservices.js`
4. Explicar triaje: el servicio recibe sintomas y signos vitales, calcula puntaje y devuelve prioridad `baja`, `media`, `alta` o `critica`.
5. Explicar inventario: el servicio recibe insumos, compara stock contra minimo y revisa vencimientos.
6. Mostrar en la aplicacion `Laboratorio > Inventario de insumos`: insumos, alertas, entradas y salidas.
7. Mostrar `Configuracion > Datos y Backup`: descargar respaldo y revisar auditoria reciente.
8. Mostrar integracion: variables `TRIAGE_SERVICE_URL` e `INVENTORY_ALERTS_SERVICE_URL`.
9. Abrir `http://localhost:5000/api/microservices/health`.
10. Mostrar Docker Compose y explicar que levanta frontend, backend, PostgreSQL y dos microservicios.
11. Cerrar con aprendizaje: separacion de responsabilidades, despliegue independiente, health checks y fallback local.

## Referencias usadas

- Microsoft Learn: https://learn.microsoft.com/es-es/dotnet/architecture/microservices/
- Microsoft Learn CRUD microservice: https://learn.microsoft.com/es-es/dotnet/architecture/microservices/multi-container-microservice-net-applications/data-driven-crud-microservice
