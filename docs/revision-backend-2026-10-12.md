# Revision del backend — 12 de octubre de 2026

Se revisaron las modificaciones locales del backend, conservando los cambios previos. La primera ejecucion de la suite de seguridad dio 30 aprobaciones y 8 fallos (38 casos, incluido SEG-34b).

## Hallazgos corregidos

- La limitacion de solicitudes estaba definida pero no instalada ni conectada. Se agregaron express-rate-limit y helmet al manifiesto/lockfile y se conectaron los limites general y de login. Los accesos exitosos no consumen el limite de fallos.
- El helper de errores estaba sin uso: las rutas de autenticacion exponian mensajes internos. Ahora conservan mensajes de validacion 4xx y responden de forma generica a errores internos.
- Se incorporaron las cabeceras de seguridad, la lista de origenes CORS permitidos y la verificacion explicita de JWT con HS256. CORS controla el acceso de navegadores; no sustituye la autenticacion.
- JSON mal formado devuelve 400 y cuerpos demasiado grandes devuelven 413, sin imprimir su contenido en el manejo de estos errores.
- Se registran accesos exitosos y fallidos al login sin contrasenas ni tokens. La auditoria sigue siendo de mejor esfuerzo: una falla de su almacenamiento se registra en el servidor.
- assertSecureEnv existia pero no se invocaba al arrancar. Se conecto antes de cargar la aplicacion en ambos puntos de entrada. El generador de secretos necesitaba importar node:crypto y agregar su comando npm.
- backend/db.js mantenia una contrasena por defecto y un pool separado. Ahora reutiliza src/config/db.js.
- El secreto JWT local de ejemplo fue sustituido por un valor aleatorio, sin mostrarlo ni incorporarlo al repositorio. Se valido la configuracion sin abrir PostgreSQL. Al reiniciar, las sesiones firmadas con la clave anterior deben iniciar sesion otra vez.
- El bloqueo de fichas para Fundacion rompia la carga de citas, laboratorio y reportes. Se agrego GET /api/pacientes/opciones, con nombre e identificador y sin DNI/contactos/ficha completa. Las pantallas usan ese endpoint y reportes toma el total de la paginacion. Se conservaron los permisos de lectura de Fundacion en la interfaz; no se habilitaron botones de escritura adicionales.
- La nueva prueba de concurrencia no estaba acompanada de una proteccion en pagos. Se movio la comprobacion del saldo dentro de una transaccion con SELECT FOR UPDATE, se rechazo un paciente distinto al cargo y se controlo la liberacion de la conexion. La prueba contra PostgreSQL exige ahora una base desechable terminada en _test y RUN_DB_INTEGRATION=true antes de cargar la aplicacion.
- Los ejemplos de configuracion ya no contienen contrasenas/secreto utilizables; Docker Compose exige valores por entorno. Para Compose se puede proporcionar el archivo local con --env-file backend/.env. Una base ya existente debe conservar su contrasena real: cambiar la variable no rota credenciales almacenadas en PostgreSQL.

## Verificacion

| Comprobacion | Resultado | Alcance |
| --- | --- | --- |
| node backend/scripts/test-security.js | 43 aprobadas, 0 fallidas | HTTP y codigo reales; PostgreSQL y esquema simulados; incluye ambos arranques con configuracion invalida y generador de secretos |
| node backend/scripts/test-settings.js | 14 aprobadas | Rutas reales y persistencia simulada |
| node backend/scripts/test-visit-conversion.js | 10 aprobadas | Conversion, reglas y cargos con DB simulada |
| node backend/scripts/test-payment-guard.js | 8 aprobadas | Rutas, saldo, identidad del paciente y errores; transacciones y bloqueos simulados |
| npm run build en frontend | Aprobada | Queda advertencia de tamano de bundle superior a 500 kB |
| frontend/scripts/check-foundation.cjs | Aprobada | Edge: Fundacion carga citas/laboratorio/reportes; administrador abre selectores; APIs interceptadas con datos sinteticos |

La primera compilacion encontro transitoriamente una exportacion faltante en Dashboard.tsx; una lectura posterior encontro la exportacion presente y la segunda compilacion paso. No se modifico ese archivo en esta revision. Las primeras pruebas de navegador intentaron usar botones de escritura con Fundacion, cuyo permiso vigente es de lectura; se corrigio la prueba para respetar ese contrato.

## Limites y pendientes

No se ejecutaron migraciones ni pruebas contra la base clinica real. La concurrencia efectiva debe comprobarse con test-payments-concurrency.js contra PostgreSQL aislado; la simulacion no certifica bloqueos del motor. Los limites de solicitudes usan memoria del proceso, por lo que un despliegue con varias instancias requiere un almacen compartido y una configuracion de proxy acorde al despliegue.

Esta revision no certifica todos los permisos de todos los modulos. El selector restringe la ficha de pacientes, pero otros endpoints existentes pueden devolver informacion clinica relacionada: requieren una matriz de permisos integral si Fundacion debe quedar excluida de toda informacion clinica. Los documentos SQA/Word anteriores conservan el corte y los resultados historicos con que fueron generados; no fueron regenerados en esta revision.
