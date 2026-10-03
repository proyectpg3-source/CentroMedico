# Revisión funcional de módulos — 20 de septiembre de 2026

## Cambios implementados y comprobados

- Dashboard: eliminados los datos de ejemplo de respaldo; tendencia mensual agregada desde PostgreSQL, últimos seis meses.
- Inventario general y farmacia: registro de productos, búsqueda, filtro de stock bajo, entradas y salidas con motivo e historial persistente. Administración y enfermería pueden registrar; fundación consulta. Se evita stock negativo con bloqueo de fila en transacción; se rechaza la salida de productos vencidos.
- Documentos: carga de PDF, PNG, JPEG y TXT hasta 5 MB, asociados a pacientes reales; listado, búsqueda, descarga y eliminación por administrador. Archivos almacenados en PostgreSQL. No hay integración con almacenamiento externo.
- Respaldo: incluye productos, movimientos y documentos en base64, versión de esquema de exportación 2.
- Prueba clínica: crea usuario, médico y paciente temporales; inicia sesión; valida triaje y consulta; comprueba movimientos concurrentes, permisos y persistencia de documentos. Limpia sus registros al finalizar.

## Verificación realizada

- `npm run test:clinical`: pasa.
- `npm run build` en frontend: pasa; conserva advertencia de tamaño del paquete JavaScript.
- Backend reiniciado; nuevas rutas responden HTTP 200 con autenticación.
- Navegador: inicio de sesión, dashboard, inventario, formulario de producto, farmacia y documentos.

## Pendientes: no considerar todos los módulos terminados

- Definir con el usuario si Facturación SAT y Predicción IA son académicas o integraciones reales. Las pantallas existentes aún usan simulaciones; no representan facturas certificadas ni un modelo predictivo validado.
- Revisar el ciclo completo de pacientes, médicos y citas usando sus formularios y cada rol.
- Completar verificación funcional de recepción, laboratorio, prescripciones, cuentas y pagos, reportes y configuración.
- Farmacia: la salida registrada descuenta stock; falta vincular dispensaciones con prescripciones, paciente y cargos. El catálogo nuevo no incluye edición de datos del producto ni control específico de medicamentos regulados.
- Documentos: falta vista previa y edición de metadatos; las descargas se comprobaron por API, no por selector de archivos del navegador.
- Revisar configuración persistente, avisos y permisos específicos de reportes; existen secciones de configuración provisionales.
- Revisar paginación en listados y selectores para bases de datos grandes.

La base local estaba vacía al iniciar. No se cargaron pacientes ni productos de demostración.
