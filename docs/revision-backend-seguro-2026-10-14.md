# Revisión de backend-seguro.zip

Conclusión: no sustituir el backend completo por este ZIP. Contiene mejoras aprovechables, pero también retrocesos frente al trabajo existente. Revisión del 14 de octubre de 2026; 61 archivos, comparados sin sobrescribir el código de la aplicación.

## Hallazgos

1. **Alta: desaparece el selector de pacientes.** En el ZIP, `src/modules/pacientes/pacientes.routes.js` no registra GET /opciones y el servicio tampoco exporta getOptions. La petición cae en /:id (línea 22) y falla como identificador inválido o por rol. El frontend actual utiliza /api/pacientes/opciones para citas, laboratorio, conteos y vinculación de Atención rápida.
2. **Alta: Atención rápida no está incluida.** Falta su módulo, su tabla en schema.js y su incorporación al respaldo. Reemplazar toda la carpeta elimina el módulo local; copiar por encima conserva el archivo pero no restaura su conexión. Una base nueva no tendrá su tabla y los respaldos versión 3 del ZIP no incluirán estas atenciones. Omitir la tabla del inicializador no borra una tabla ya existente.
3. **Alta: se revierten permisos acordados.** Citas (rutas 25, 41 y 60) y varias escrituras de laboratorio vuelven a permitir Fundación. Contradice el flujo de consulta que veníamos protegiendo; ocultar botones no impide escrituras por API.
4. **Alta: validación de citas después de escribir.** En citas.routes.js, línea 45 llama a update antes de validar en línea 48. El servicio pierde validateBeforeWrite y el tratamiento de fechas Date devueltas por PostgreSQL. Puede producir cambios antes de responder un error y fallar en actualizaciones parciales.
5. **Media: validadores permisivos.** Ejecutando únicamente el archivo de validadores del ZIP, `41abc` y `41.5` se aceptan como ID 41; `100abc` como monto 100; null y false se consideran fechas válidas. La versión local revisada tiene controles más estrictos.
6. **Media: activación de usuarios.** auth.service.js, líneas 200–203, elimina la exigencia de un booleano y usa Boolean(activo). La cadena "false" se convierte en verdadero; omitir el valor puede desactivar una cuenta. El control estricto local se perdería.
7. **Media: respaldo incompleto respecto del proyecto.** backups.routes.js vuelve a schemaVersion 3 y excluye atencionesRapidas. Conservar la versión 4 y la nueva tabla al integrar mejoras.

## Problemas ya presentes en la carpeta actual

- El app.js local inspeccionado ya no monta /api/atenciones-rapidas, aunque el componente frontend y el archivo del módulo siguen presentes. El ZIP tampoco lo monta. No es una regresión exclusiva de importar el ZIP.
- El package.json local ya coincide con el del ZIP: npm test importa la aplicación, lo que inicia ensureSchema contra la configuración disponible. No ejecuté ese comando. Faltan en el ZIP varios scripts aislados que todavía existen localmente.
- Las consultas SQL locales y las del ZIP presentan diferencias importantes de columnas y agregación. Algunas versiones del ZIP coinciden mejor con el schema.js distribuido (por ejemplo referencia_tipo/referencia_id de cargos y movimientos negativos de farmacia). No corresponde declarar cada diferencia una regresión ni copiar queries.js a ciegas: se necesita contrastar con el esquema instalado y ejecutar integración aislada.

## Mejoras aprovechables

- bcrypt también cuando no existe el correo, para reducir diferencias temporales de autenticación.
- Comprobar la contraseña antes de comunicar que una cuenta está desactivada.
- Declarar HS256 explícitamente al firmar tokens.
- Cambios de contenedor para ejecutar con usuario sin privilegios, instalación mediante npm ci y comprobación de salud, sujetos a probar la imagen.

## Evidencia y límites

Se compararon rutas, servicios, esquema, configuración y llamadas actuales del frontend. Se ejecutaron cinco entradas concretas contra los validadores del ZIP; resultado en output/revision-backend-seguro/resultado-validadores.json. El archivo de validadores fue inspeccionado antes de ejecutarlo y no accede a PostgreSQL.

No se arrancó el servidor del ZIP, no se ejecutaron sus scripts de instalación/seed ni sus pruebas que acceden a base de datos. No se modificaron datos ni archivos de la aplicación. Las afirmaciones de CAMBIOS.md sobre pruebas previas y secretos son declaraciones del autor del ZIP, no resultados verificados de esta revisión.

Recomendación: integrar selectivamente las mejoras de autenticación y Docker sobre una copia del estado actual, preservar módulos y contratos, reparar la conexión de Atención rápida y probar contra PostgreSQL desechable antes de sustituir archivos operativos.
