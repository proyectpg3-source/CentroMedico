# Pendientes y avances — 12 de octubre de 2026

## Completado en esta continuacion

1. **Edicion de citas:** se valida antes de calcular prioridad y escribir. Una solicitud invalida ya no modifica datos para despues devolver 400. Las actualizaciones parciales conservan la fecha que PostgreSQL devuelve como objeto Date.
2. **Validaciones compartidas:** identificadores positivos enteros seguros, importes sin sufijos o booleanos y rechazo de fechas ausentes que JavaScript interpretaba como 1970. Esto no constituye validacion exhaustiva de todos los formatos de fecha ni de las reglas clinicas de cada modulo.
3. **Estado de usuarios:** exige un booleano real; un campo omitido o una cadena como "false" no cambia la cuenta. Se mantiene la prohibicion de desactivarse a uno mismo.
4. **Fundacion:** conserva consultas y el selector limitado de pacientes. Se retiraron permisos de escritura de citas, insumos, ordenes y resultados de laboratorio que contradecian la interfaz de solo lectura. No se ampliaron permisos clinicos de otros roles.
5. **Apariencia:** texto normal/grande, movimiento reducido y restablecimiento. Persistencia en este navegador, sincronizacion entre pestanas y mensaje de error si el almacenamiento falla. Se mantiene el diseno verde y el dashboard restaurado.
6. **Pruebas reales:** se creo una instancia temporal independiente de PostgreSQL 16, con puerto y credenciales aleatorios. Cinco pagos concurrentes de 60 sobre un cargo de 100 dieron 201/400/400/400/400 y un total pagado de 60. Tambien paso el flujo clinico existente: triaje, visita, stock concurrente, receta con precio de catalogo, dispensacion parcial y concurrente, documentos y resumen del dashboard. El cluster se detuvo y elimino al terminar; no se uso la base del centro medico.
7. **Comando de pruebas:** npm test ejecuta solo suites aisladas; ya no importa la aplicacion con la base real. El flujo clinico requiere una base de pruebas explicita, o el ejecutor temporal.

## Evidencia

| Prueba | Resultado | Tipo |
| --- | --- | --- |
| Seguridad | 44 casos aprobados | HTTP/servicios reales, DB simulada; incluye 11 escrituras denegadas a Fundacion dentro de SEG-43 |
| Validaciones | 18 casos aprobados | Regresion HTTP y utilidades; antes de corregir habia 13 fallos |
| Configuracion | 14 casos aprobados | DB simulada |
| Conversion de visita | 10 casos aprobados | DB simulada |
| Proteccion del pago | 8 casos aprobados | DB y bloqueo simulados |
| Pagos simultaneos | Aprobada | PostgreSQL 16 temporal real |
| Flujo clinico | Aprobada | PostgreSQL 16 temporal real |
| Apariencia | Aprobada | Edge, APIs sinteticas; 320/390/768/1440 px, persistencia, restablecimiento y fallo de almacenamiento |
| Compilacion frontend | Aprobada | Advertencia existente: bundle superior a 500 kB |

Total de casos de las cinco suites aisladas: **94 aprobados**. Las dos suites PostgreSQL se registran por separado; no se suman como si fueran dos casos unitarios ni equivalen a una auditoria completa.

Resultados disponibles en `output/sqa/resultados_pruebas_aisladas.json`, `output/sqa/resultados_seguridad.json` y `output/sqa/resultados_postgres_aislado.json`. Capturas en `output/pendientes-verificados/`.

## Reproduccion

Desde backend:

```powershell
npm test
npm run test:postgres-isolated
```

El segundo comando busca PostgreSQL en `C:/Program Files/PostgreSQL/16/bin`; se puede definir PG_TEST_BIN para otra instalacion. El ejecutor crea y elimina su propio cluster temporal. No requiere copiar las credenciales de la base de trabajo.

## Pendientes priorizados

- **Matriz completa de permisos:** confirmar con el analista que detalle clinico puede consultar Fundacion a traves de visitas, recetas y laboratorio. El selector limitado no sustituye esta revision. Tambien hay diferencias entre acciones visibles para medico/enfermeria y las autorizaciones de algunas rutas; no se otorgaron nuevos privilegios por suposicion.
- **Reportes por rol:** medico tiene acceso a la pantalla, pero los endpoints financieros lo rechazan; adaptar el informe para mostrar solo los bloques autorizados. Revisar tambien que los totales de reportes y selectores no dependan unicamente de la primera pagina de listas.
- **Correo/SMS:** definir proveedor, remitente y reglas de recordatorio antes de integrar envios. No se enviaron mensajes ni se configuraron cuentas externas.
- **Preferencias del centro:** idioma y zona horaria se guardan, pero falta una aplicacion integral a traducciones y formatos. No presentar esa persistencia como traduccion completa del sistema.
- **Despliegue:** si se usan varias instancias, el limitador necesita almacenamiento compartido y configuracion de proxy. Mantener respaldos restaurables y probar recuperacion en un entorno aislado.
- **Entrega SQA:** actualizar el Word y las matrices con este corte, adjuntar evidencia, y completar nombres, notas y firmas por los responsables. Los documentos anteriores siguen siendo historicos.

No hay una certificacion de ausencia de errores ni una medicion completa de cobertura. Los resultados corresponden a los casos y entornos descritos.
