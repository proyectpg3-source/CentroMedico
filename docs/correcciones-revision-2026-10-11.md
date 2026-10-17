# Correcciones de revisión del 11 de octubre de 2026

## Observaciones verificadas

- El dashboard actual inicia con datos nulos y skeletons; la tendencia usa `citas_por_mes` del resumen del backend, calculado desde PostgreSQL. No se encontró el respaldo ficticio descrito en la revisión. Se comprobó carga retardada y representación de la serie devuelta por la API en navegador aislado.
- El buscador superior encuentra módulos por nombre, filtra por rol y navega al resultado. La campana sin acción descrita en la revisión ya no está en el encabezado actual.
- Nueva cita abre el formulario en la propia agenda. Se comprobó su apertura. Cuando no hay pacientes o médicos, ahora explica el requisito previo en vez de dejar solo un botón deshabilitado.
- Usuarios y exportación de respaldo ya tenían APIs. Se comprobaron creación de usuario y descarga del JSON desde sus controles en navegador con API sintética.

## Correcciones realizadas

- General carga y guarda con `GET` y `PUT /api/configuracion`. El backend autoriza solamente administradores, valida campos, guarda JSONB en `configuracion_centro` y registra auditoría. El frontend no anuncia éxito hasta recibir confirmación; presenta carga, error y reintento, y permite nueva lectura del valor guardado. No hay teléfono, dirección o identificación inventados por defecto.
- Los datos generales son metadata del centro. Su guardado no incorpora traducciones de la interfaz ni cambia todos los formateadores de fecha del sistema.
- Seguridad usa el mismo formulario de cambio de contraseña que Mi cuenta, conectado a la API existente; valida confirmación y conserva errores del servidor.
- Notificaciones informa que correo y SMS no están integrados. Se retiraron interruptores locales que aparentaban habilitar envíos. Apariencia mantiene su alcance pendiente; no se rediseñó el sistema.
- El respaldo exporta la configuración nueva y declara versión de esquema 3. Solo se agregó un dato al exportador; no se implementó restauración.

## Conversión de cita a visita

Se reprodujo HTTP 400 con el mensaje de paciente, médico y fecha obligatorios usando el mismo formato de solicitud del formulario: `id_cita` y datos de consulta, sin los identificadores de paciente y médico.

La ruta validaba antes de que el servicio recuperara esos datos de la cita. Se pasó la validación al servicio después de resolver la cita, tanto para crear como para actualizar. Si se incluyen identificadores explícitos, deben coincidir con la cita; se rechazan citas canceladas, inexistentes y datos inválidos. El frontend también envía los identificadores de la cita para mantener compatibilidad con el servidor anterior durante la actualización.

Se comprueba que una conversión válida cree la visita con las relaciones correctas, marque la cita completada y cree el cargo con el valor de consulta. La restricción de visita duplicada se conserva. Las etiquetas del formulario se asociaron a sus campos.

## Verificación

- `backend/scripts/test-settings.js`: 14 casos aprobados. Configuración inicial, guardado y nueva lectura, validación, acceso denegado, falla sin éxito aparente y exportación con configuración.
- `backend/scripts/test-visit-conversion.js`: 10 casos aprobados. Reprodujo el error antes de corregirlo; valida conversión, cargo, duplicado, errores y visita directa completa.
- `frontend/scripts/check-review.cjs`: aprobado. Dashboard sin cifras durante la espera, serie mensual desde API, buscador, formulario de cita, conversión con paciente/médico, guardar y recargar, fallo de guardado, cambio de contraseña, creación de usuario y descarga de respaldo.
- `frontend/scripts/check-ui.cjs`: aprobado. Login y 18 módulos en escritorio/móvil sin errores JavaScript en el recorrido.
- Compilación Vite aprobada; persiste advertencia de tamaño de JavaScript.

Las pruebas HTTP usan rutas y servicios reales con dobles estrictos de PostgreSQL y de inicialización del esquema. Las de navegador interceptan toda la API. No se ejecutaron migraciones ni pruebas sobre pacientes reales. La aplicación incorporará la tabla nueva mediante su inicializador de esquema al arrancar el backend actualizado; debe verificarse ese arranque en el ambiente correspondiente.

Los dos hallazgos de seguridad documentados anteriormente siguen abiertos: política de lectura de pacientes para Fundación y filtración del mensaje de excepción en login. Esta revisión no se presenta como su corrección ni como aceptación integral por SQA.
