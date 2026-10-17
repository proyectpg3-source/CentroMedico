# Integración selectiva de backend-seguro.zip

Se integraron mejoras compatibles sobre el proyecto local, sin sustituir carpetas ni modificar la base operativa.

## Cambios

- Autenticación: bcrypt se ejecuta también para correos inexistentes; el estado desactivado solo se comunica después de comprobar la contraseña. Se declara HS256 al firmar JWT. Esto reduce diferencias observables, no garantiza tiempos idénticos.
- Docker: instalación con npm ci, usuario node sin privilegios, healthcheck HTTP y exclusión de archivos de entorno y respaldos. No se cambiaron dependencias.
- Se restauró el montaje de Atención rápida en app.js y el comando npm test que ejecuta únicamente pruebas aisladas.
- Se preservaron el selector limitado de pacientes, validaciones estrictas, permisos de Fundación de solo lectura, tabla de Atención rápida y respaldo versión 4.
- Se recuperó la validación paciente/cargo en pagos. El paciente se toma del cargo bloqueado y se controla el fallo al obtener una conexión.
- Se corrigieron incompatibilidades SQL previas comprobadas contra el esquema: cargos utiliza referencia_tipo/referencia_id; farmacia calcula las salidas por movimientos negativos; laboratorio usa el paciente de la orden y conserva validado_por como texto. Se mantienen los alias de respuesta y los conteos mediante subconsultas.

## Pruebas

- Nueva prueba de autenticación: primero falló porque un correo inexistente omitía bcrypt; después pasó. Incluye cuenta desactivada con contraseña incorrecta/correcta, usuario sin hash expuesto y token HS256.
- Suite aislada ampliada a 98 casos con PostgreSQL simulado.
- Suites PostgreSQL en clúster temporal independiente: pagos concurrentes, flujo clínico, Atención rápida y compatibilidad de las siete consultas compartidas con el esquema. Resultados de la última ejecución en output/sqa/resultados_postgres_aislado.json.
- Compilación del frontend aprobada; permanece el aviso previo de tamaño del paquete.
- Docker Desktop no tiene el motor iniciado: la imagen modificada queda pendiente de construir y ejecutar. No se afirma validación del contenedor.

La primera integración real reprodujo un error de columna inexistente en cargos, corregido en esta integración. Las pruebas usan credenciales y registros sintéticos. El clúster temporal se elimina al finalizar; no se ejecutaron migraciones contra la base del centro.

## Activación

Reiniciar el backend para cargar el código actualizado. Para un despliegue Docker, iniciar Docker Desktop y validar la construcción del contenedor antes de publicarlo. Continúan pendientes los preparativos de producción de la guía de despliegue, incluyendo revisión completa de permisos clínicos y recuperación de respaldos.
