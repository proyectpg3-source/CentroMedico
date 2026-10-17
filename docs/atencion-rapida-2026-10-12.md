# Atención rápida

Acceso desde el panel principal y la navegación, con sesión de administrador, médico, enfermería o recepción. Fundación no tiene acceso.

Permite abrir un registro con motivo obligatorio y nombre opcional sin crear un paciente, una cita ni un médico ficticio. El servidor asigna un código AR y conserva el usuario iniciador, las fechas y el último usuario que actualizó el registro. La clave UUID de solicitud evita duplicados por reintentos del mismo envío.

Estados: pendiente → en atención → finalizada. Solo administrador, médico y enfermería pueden cambiar el estado; recepción también puede registrar y vincular la ficha posteriormente. El vínculo puede completarse incluso después de finalizar. Un vínculo existente no puede sustituirse desde este flujo. La búsqueda de fichas muestra hasta 100 coincidencias por nombre, con identificador para comprobar la selección.

Este ingreso no crea automáticamente una visita médica, receta, cargo o triaje. Esos procesos conservan sus formularios y validaciones. No clasifica urgencias automáticamente ni envía alertas de emergencia.

## Persistencia y activación

La tabla `atenciones_rapidas` se crea con el inicializador de esquema al reiniciar el backend. No se ejecutó una migración contra la base operativa durante el desarrollo. Se incluye en el respaldo administrativo JSON, ahora versión 4.

## Verificación

- `npm.cmd test --prefix backend`: 94 casos aislados aprobados, con base simulada.
- `node backend/scripts/test-postgres-isolated.js`: tres suites aprobadas sobre PostgreSQL 16 temporal. La nueva suite realiza 23 comprobaciones de autenticación, roles, guardado real, solicitudes concurrentes, estados, vínculo y respaldo. El clúster temporal se detuvo y eliminó.
- `npm.cmd run build` en frontend: aprobado; permanece advertencia de tamaño del paquete JavaScript.
- `node scripts/check-quick-care.cjs` en frontend con Playwright: aprobado en Edge y APIs simuladas. Formulario sin paciente, recarga, estados, búsqueda/vínculo, conservación del formulario ante error y permisos visibles. Sin desbordamiento a 320, 390, 768 y 1440 px.
- Capturas revisadas: `output/atencion-rapida/desktop.png` y `mobile.png`.

No se verificó la interfaz contra la base operativa ni se modificaron datos reales. `git diff --check` detectó espacios finales preexistentes en comentarios de autenticación y roles.
