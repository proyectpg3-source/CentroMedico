# CentroMedico: despliegue y diagrama de base de datos

Preparación revisada el 13 de octubre de 2026. Destino previsto: uso con pacientes reales. No se ha contratado alojamiento, publicado el sistema ni transferido datos.

## Qué se publica

| Componente | Tecnología actual | Función |
|---|---|---|
| Interfaz | React y Vite | Pantallas utilizadas en el navegador |
| API | Node.js y Express | Autenticación, permisos y operaciones |
| Base | PostgreSQL | Datos persistentes |
| Servicios auxiliares | Node.js | Priorización e inventario, si se habilitan |

El navegador llama a la API; solamente el backend se conecta a PostgreSQL. Las credenciales de la base y el secreto de sesión pertenecen al entorno del backend, nunca a variables VITE ni al repositorio.

## Opción para evaluar

Un proveedor administrado con sitio estático, servicio Node y PostgreSQL reduce la administración de servidores. Render ofrece esos tres tipos de servicio. Es una opción técnica para evaluar, no una contratación ni una confirmación de idoneidad para el manejo de expedientes del centro. Antes de elegir faltan presupuesto, región de almacenamiento requerida, volumen y condiciones de tratamiento de datos aceptadas por el responsable del centro.

Fuentes: [tipos de servicios](https://render.com/docs/service-types), [sitios estáticos](https://render.com/docs/static-sites), [respaldos PostgreSQL](https://render.com/docs/postgresql-backups). Los respaldos continuos descritos por Render corresponden a bases de pago; revisar retención y capacidad del plan al contratar.

## Configuración propuesta para un entorno de pruebas

Primero usar datos sintéticos en una base independiente. No copiar expedientes a un alojamiento provisional.

| Servicio | Directorio raíz | Compilación / instalación | Inicio o salida |
|---|---|---|---|
| Frontend estático | frontend | npm ci && npm run build | dist |
| Backend Node | backend | npm ci --omit=dev | npm start |

En el sitio estático, configurar una reescritura de las rutas de la aplicación hacia `/index.html` para que la recarga de páginas funcione. El backend dispone de `/api/health` para comprobar conectividad con la base.

### Variables del frontend

- `VITE_API_BASE_URL`: dirección HTTPS pública del backend, sin barra final. Se incorpora al compilar; un cambio requiere recompilar.
- No colocar contraseñas ni secretos en variables `VITE_*`.

### Variables del backend

- `NODE_ENV=production`.
- `PORT`: utilizar el puerto proporcionado por el alojamiento.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: datos de conexión del proveedor. El código actual utiliza estas variables separadas, no `DATABASE_URL`.
- `DB_SSL=true` cuando la conexión requiera TLS; mantener la verificación del certificado. Resolver la cadena de confianza según el proveedor, sin desactivar la verificación como solución general.
- `JWT_SECRET`: secreto nuevo y aleatorio almacenado en el gestor de secretos del proveedor.
- `CORS_ORIGIN`: origen HTTPS exacto del frontend.
- `TRIAGE_SERVICE_URL` e `INVENTORY_ALERTS_SERVICE_URL`: direcciones privadas si se despliegan los servicios auxiliares. No reutilizar localhost de desarrollo; si se omiten, verificar los flujos que usan las alternativas locales.

## Hallazgos que deben resolverse antes del uso real

1. **Permisos clínicos:** las rutas GET de visitas y prescripciones requieren sesión, pero no restringen roles en esas rutas. Acordar una matriz de acceso clínico y administrativo, aplicarla en la API y probar accesos denegados sin depender de pantallas ocultas.
2. **Sesión:** actualmente el token está en localStorage. Evaluar migración a cookies HttpOnly/Secure con protección CSRF y configuración coherente entre dominios. No se ha implementado esa migración.
3. **Esquema:** se inicializa durante el arranque. Preparar migraciones versionadas y separar permisos de migración de los permisos diarios de la aplicación.
4. **Proxy y límites:** comprobar la IP que recibe Express detrás del proveedor antes de configurar trust proxy. Verificar los límites de intentos; si hay varias instancias, requieren un almacenamiento compartido para mantener límites globales.
5. **Recuperación:** el JSON exportado por la aplicación no demuestra una recuperación completa. Programar respaldos PostgreSQL y restaurar uno en una base desechable; comprobar tablas, relaciones, documentos y operaciones básicas. Definir cuánto dato y tiempo de interrupción admite el centro.
6. **Despliegue actual:** el archivo docker-compose.microservices.yml expone PostgreSQL y servicios auxiliares en puertos del host y utiliza URLs localhost. Es configuración local, no una configuración de producción aprobada.
7. **Operación:** definir responsable de accesos, bajas de usuarios, alertas, recuperación y actualización del sistema. Revisar registros para evitar contraseñas, tokens y detalles clínicos innecesarios.

## Orden de puesta en marcha

1. Resolver presupuesto y requisitos de alojamiento del centro.
2. Corregir y probar los puntos anteriores que afecten al entorno elegido.
3. Crear un entorno de pruebas con base y secretos propios.
4. Verificar login y permisos por rol, pacientes, citas, visitas, Atención rápida, laboratorio, farmacia y pagos mediante la interfaz conectada a esa API.
5. Probar respaldo y restauración, navegación directa, HTTPS, expiración de sesión y comportamiento tras reiniciar servicios.
6. Preparar dominio, entorno definitivo y procedimiento de reversión.
7. Migrar datos con respaldo previo, validar el resultado y habilitar el uso tras revisión del responsable del centro.

## Diagrama entidad-relación con pgAdmin

1. Abrir pgAdmin y conectarse a la base que se desea documentar.
2. En el explorador, hacer clic derecho sobre esa base y elegir **ERD For Database**.
3. Revisar las tablas y sus enlaces, generados a partir de claves foráneas reales.
4. Usar **Auto align** y ajustar manualmente la posición de las tablas para facilitar la lectura.
5. Usar **Save** para conservar una copia editable y **Download image** para incorporarla al informe.
6. Si el diagrama completo resulta demasiado grande, conservarlo como anexo y preparar vistas por áreas para la presentación.

Fuente: [documentación oficial de ERD en pgAdmin](https://www.pgadmin.org/docs/pgadmin4/latest/erd_tool.html).

El diagrama representa la estructura instalada, no los registros de pacientes. Una relación no declarada como clave foránea no aparecerá automáticamente. La tabla atenciones_rapidas aparecerá únicamente si su cambio de esquema ya está aplicado. Para generar la imagen no hace falta ejecutar el SQL que ofrece la herramienta.

## Estado de las verificaciones

La implementación previa pasó 94 casos aislados de backend, pruebas con PostgreSQL temporal y comprobaciones de interfaz con API simulada. Esto no equivale a una prueba de producción: todavía no se han verificado el proveedor, dominio, TLS, recuperación ni la interfaz completa contra una API alojada.

Esta guía no cambia permisos, infraestructura ni datos. La siguiente decisión necesaria es presupuesto mensual y requisitos de ubicación de datos del centro.
