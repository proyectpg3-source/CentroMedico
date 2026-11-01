# Usuarios, roles y protección de lecturas

## Gestión de cuentas

El módulo ya está en **Configuración → Usuarios** y utiliza la tabla `usuarios`.
Solo un administrador puede listar cuentas, crearlas y activar/desactivar usuarios.
La API vuelve a consultar el usuario en cada solicitud: un rol incluido en el token
no sustituye al rol de la base y las cuentas inactivas no conservan acceso.

## Correcciones de esta revisión

| Recurso | Lectura permitida |
|---|---|
| Visitas e historial clínico completo | Administrador, médico y enfermería |
| Prescripciones y laboratorio | Administrador, médico, enfermería y Fundación |
| Datos financieros del resumen | Administrador, recepción y Fundación |

Recepción y Fundación ya no pueden obtener visitas ni historias completas mediante
llamadas directas a `/api/visitas`, aunque conozcan el identificador. Recepción tampoco
accede a prescripciones ni laboratorio. Se conserva la lectura de farmacia y laboratorio
de Fundación que ya estaba habilitada en la interfaz; no se cambia esa política.

Las comprobaciones están en el backend, antes de consultar los servicios clínicos.
Una solicitud sin sesión devuelve 401; una sesión sin el rol requerido devuelve 403.
Las restricciones de creación, actualización, validación y dispensación siguen siendo
independientes de los permisos de lectura.

El resumen no devuelve el bloque `financiera` a médico o enfermería. Reportes obtiene
el número de visitas desde el resumen agregado, sin descargar expedientes completos;
solo solicita cargos y pagos cuando el rol puede consultar cobros.

La matriz del frontend coincide con operaciones del servidor: enfermería registra
pacientes, citas y triajes, consulta expedientes y no valida prioridades; el médico
crea/edita visitas y recetas, pero no edita fichas de pacientes ni agenda desde los
formularios administrativos. La captura de resultados y el mantenimiento de insumos
siguen reservados al administrador; los movimientos admiten también enfermería.

## Evidencia

`test-clinical-permissions.js` ejecuta 80 comprobaciones HTTP con middleware y rutas
reales; sustituye la base y los servicios por datos sintéticos. Comprueba roles
permitidos/denegados, ausencia de sesión, cuenta desactivada, rol falsificado en el
contenido del token, privacidad financiera y ausencia de consultas/escrituras
clínicas en solicitudes rechazadas. Una copia en memoria del código anterior falla
porque Recepción obtiene 200 al solicitar visitas, mientras el código corregido da 403.

Se ejecutaron `npm test` (14 suites), `npm run test:flujo` (60 comprobaciones sobre
PostgreSQL embebido temporal) y la compilación de producción del frontend.
No se crearon cuentas ni se modificaron expedientes o permisos de usuarios reales.

Esta revisión cubre esas fronteras de roles y pantallas asociadas. No equivale a una
auditoría completa de dependencias, infraestructura, sesiones o acceso por expediente.
