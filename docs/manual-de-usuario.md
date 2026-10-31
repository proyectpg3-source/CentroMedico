# Manual de usuario

## Centro Médico La Aurora

**Destinatarios:** personal de Recepción, Enfermería, Médico, Fundación y Administración.

**Fecha:** 30 de octubre de 2026, Guatemala.

**Versión del manual:** 0.1, borrador para validación operativa.

**Base revisada:** código local, revisión `99105bcb7b6c19a029e4134af634017afa62c6db`.

**Estado:** funciones identificadas por lectura del código; no se ejecutaron operaciones en producción.

Este manual explica cómo registrar y consultar la atención del centro, desde el ingreso del paciente hasta el cobro. Cada persona debe utilizar su cuenta y las acciones autorizadas para su rol. Los nombres entre comillas corresponden a textos de la interfaz; se conserva su ortografía para facilitar su localización.

El entorno de referencia comunicado utiliza Vercel para la interfaz, Render para el servidor y PostgreSQL en Neon. No se ha confirmado la URL publicada ni que su versión coincida con esta revisión. La administración debe completar la validación del anexo antes de adoptar el documento como manual definitivo. No se incluyen credenciales, datos de pacientes ni capturas de producción.

## Índice

1. [Uso básico y recorrido de atención](#1-uso-básico-y-recorrido-de-atención)
2. [Roles y acceso](#2-roles-y-acceso)
3. [Acceso y cierre de sesión](#3-acceso-y-cierre-de-sesión)
4. [Navegación y cuenta](#4-navegación-y-cuenta)
5. [Pacientes y prevención de duplicados](#5-pacientes-y-prevención-de-duplicados)
6. [Citas médicas y Recepción](#6-citas-médicas-y-recepción)
7. [Atención rápida](#7-atención-rápida)
8. [Triaje y priorización](#8-triaje-y-priorización)
9. [Expedientes y consulta](#9-expedientes-y-consulta)
10. [Prescripciones y Farmacia](#10-prescripciones-y-farmacia)
11. [Laboratorio](#11-laboratorio)
12. [Inventarios](#12-inventarios)
13. [Documentos](#13-documentos)
14. [Cuentas y pagos](#14-cuentas-y-pagos)
15. [Doctores y Reportes](#15-doctores-y-reportes)
16. [Configuración y usuarios](#16-configuración-y-usuarios)
17. [Problemas frecuentes](#17-problemas-frecuentes)
18. [Privacidad y soporte](#18-privacidad-y-soporte)
19. [Capturas pendientes](#19-capturas-pendientes)
20. [Validación y fuentes](#20-validación-y-fuentes)

## 1 Uso básico y recorrido de atención

Requisitos generales: conexión a internet, navegador, dirección oficial proporcionada por el centro y cuenta activa. No se ha certificado una lista de navegadores o dispositivos compatibles. Antes de guardar, confirme la identidad del paciente y revise los campos obligatorios marcados con asterisco. Espere el resultado y compruebe que el registro aparezca; si hay una interrupción, consulte la lista antes de repetir la operación.

Recorrido habitual: localizar paciente → agendar o registrar ingreso → registrar triaje → documentar visita médica → registrar órdenes y prescripciones cuando correspondan → registrar entrega de medicamentos → consultar cargos y aplicar pagos. Una cita, un triaje, una visita, una prescripción y un pago son registros distintos. Cambiar una cita a atendida no sustituye la historia clínica, y guardar tratamiento en texto no equivale a crear una prescripción dispensable.

Para un ingreso sin identificación completa existe “Atención rápida”. No invente un DPI para superar los requisitos de la ficha de pacientes. Siga el protocolo asistencial del centro y complete o vincule la ficha cuando se confirme la identidad.

## 2 Roles y acceso

Roles reales: **Administrador** (`admin`), **Médico** (`medico`), **Enfermería** (`enfermero`), **Fundación** (`fundacion`) y **Recepción** (`recepcionista`). No se identificó un rol de paciente ni un portal de autoservicio para pacientes en las rutas revisadas.

La siguiente tabla describe acceso a pantallas, no autorización para todas sus acciones.

| Pantalla del menú | Roles con acceso a la pantalla |
| --- | --- |
| Vista general y Citas médicas | Todos |
| Atención rápida y Pacientes | Administrador, Médico, Enfermería, Recepción |
| Recepción | Administrador, Recepción, Enfermería |
| Triaje, Priorización y Expedientes | Administrador, Médico, Enfermería |
| Documentos | Administrador, Médico, Enfermería |
| Doctores, Laboratorio y Prescripciones | Administrador, Médico, Enfermería, Fundación |
| Insumos de laboratorio, Inventario general y Farmacia | Administrador, Enfermería, Fundación |
| Cuentas y pagos | Administrador, Fundación, Recepción |
| Facturación SAT | Administrador, Fundación; pantalla de demostración |
| Reportes | Administrador, Médico, Fundación; véase limitación en sección 15 |
| Configuración | Administrador |

**Diferencias comprobadas entre pantalla y servidor:** Enfermería tiene lectura de Pacientes y no dispone de botones para crear o editar citas en la interfaz, aunque el servidor permite crear y editar esos registros. El Médico puede ver “Editar” en Pacientes y Citas, pero el servidor rechaza la edición de esos datos; sí permite al Médico cambiar el estado de citas. Enfermería puede ver acciones de visitas y laboratorio que el servidor no permite guardar. Para los procedimientos siguientes se usa la coincidencia de permisos necesaria para completar la operación por la interfaz. Si aparece un botón fuera de su alcance, no intente eludir la restricción; informe al administrador.

## 3 Acceso y cierre de sesión

### 3.1 Ingresar

**Rol:** todos. **Requisitos:** cuenta activa y dirección oficial del sistema.

1. Abra la dirección oficial y la pantalla “Acceso al sistema”.
2. Escriba “Correo electrónico” y “Contraseña”. El botón del ojo permite mostrar u ocultar la contraseña.
3. Pulse “Ingresar” y espere que termine “Validando acceso...”.
4. Compruebe su nombre y rol en la aplicación.

**Resultado esperado:** acceso a la vista solicitada o a “Vista general”, con menú según el rol de la cuenta. El rol lo determina la cuenta; no se selecciona al ingresar.

**Problemas:** si las credenciales fallan, revise correo y contraseña. Si la cuenta está desactivada, contacte al administrador. Hay limitación de intentos fallidos; ante un bloqueo espere lo indicado por el sistema. No hay recuperación de contraseña por correo documentada en esta pantalla.

**[CAPTURA C01 PENDIENTE: acceso vacío, sin correo ni contraseña.]**

### 3.2 Cerrar sesión

**Rol:** todos. **Requisito:** sesión abierta y trabajo guardado.

1. Termine y compruebe las operaciones pendientes.
2. En la parte inferior del menú lateral pulse el icono con título “Cerrar sesión”. Con el menú contraído, el botón circular del usuario cumple esta función.
3. Verifique que vuelva a solicitar acceso antes de dejar el equipo.

**Resultado esperado:** termina el acceso en ese navegador. **Problemas:** cerrar una pestaña no sustituye este procedimiento; si la sesión queda visible, cierre sesión antes de entregar el equipo.

## 4 Navegación y cuenta

### 4.1 Abrir un módulo

**Rol:** todos, según tabla de acceso. **Requisito:** sesión activa.

1. Use el menú lateral, organizado en “Resumen”, “Atención clínica”, “Operación”, “Finanzas” y “Administración”.
2. Seleccione el nombre del módulo. También puede usar la búsqueda “Ir a un módulo” de la cabecera.
3. Si el menú está contraído, use “Expandir menu lateral”; en pantallas pequeñas abra el menú y seleccione el módulo.

**Resultado esperado:** aparece el título del módulo y sus registros o un mensaje de carga/error. **Problemas:** un menú ausente puede corresponder al rol; una lista vacía con aviso de error no demuestra que no existan registros.

**[CAPTURA C02 PENDIENTE: menú y cabecera con cuenta de prueba, indicando el rol.]**

### 4.2 Cambiar contraseña

**Rol:** todos, sobre su propia cuenta. **Requisito:** conocer la contraseña actual.

1. Abra “Mi cuenta” desde el perfil de la cabecera.
2. En “Cambiar contraseña”, complete “Contraseña actual”, “Nueva contraseña” y “Confirmar nueva contraseña”.
3. Use al menos ocho caracteres y pulse “Actualizar contraseña”.
4. Compruebe el mensaje de resultado.

**Resultado esperado:** contraseña actualizada. **Problemas:** si la confirmación no coincide o la clave actual no es correcta, corrija los campos. Si olvidó la contraseña, solicite asistencia; no se documenta aquí un restablecimiento automático.

## 5 Pacientes y prevención de duplicados

### 5.1 Buscar y consultar

**Rol:** Administrador, Médico, Enfermería, Recepción. **Requisito:** datos de identificación confirmados.

1. Abra “Pacientes”.
2. Use “Buscar por nombre, DPI, email o teléfono...”. Pruebe el DPI y luego nombre o contacto si no encuentra coincidencia.
3. Revise las coincidencias; abra el menú de tres puntos de la fila y pulse “Ver ficha”. Se muestra “Ficha del Paciente”.
4. Compare nombre, DPI y demás datos disponibles antes de utilizar ese registro.

**Resultado esperado:** ficha correcta localizada. **Problemas:** nombres similares o contactos compartidos no prueban identidad. Si hay dos fichas de la misma persona, reporte ambos identificadores al administrador; no se identificó una función de fusión de pacientes.

### 5.2 Registrar o corregir datos

**Rol para completar por la interfaz:** Administrador o Recepción. **Requisitos:** buscar primero; nombre y DPI confirmado. La ficha exige DPI de 13 dígitos; no se garantiza que bloquee todos los duplicados por DPI.

1. En “Pacientes”, pulse “Nuevo Paciente”, o “Editar” sobre la ficha correcta.
2. Complete “Nombre completo *” y “DPI *”. Registre “Teléfono”, “Email”, “Fecha de nacimiento”, “Sexo”, residencia y contacto de emergencia cuando estén disponibles y confirmados.
3. Revise especialmente identidad y contacto.
4. Pulse “Registrar Paciente” o “Guardar Cambios”.
5. Vuelva a buscar y compruebe la información guardada.

**Resultado esperado:** alta o actualización de la ficha. **Problemas:** “Nombre y DPI son obligatorios.” y “El DPI debe tener 13 digitos.” requieren corregir los datos. La actualización del teléfono sustituye el campo actual; no se ha verificado un historial consultable de teléfonos anteriores. No interprete el ejemplo de prefijo de la pantalla como obligación de usar un país concreto.

La eliminación de pacientes está reservada a Administrador. No la use como método habitual para corregir duplicados: primero deben revisarse las relaciones clínicas y financieras y las reglas internas del centro.

**[CAPTURA C03 PENDIENTE: búsqueda y ficha con datos ficticios.]**

**[CAPTURA C04 PENDIENTE: Nuevo Paciente y validación de DPI con datos ficticios.]**

## 6 Citas médicas y Recepción

### 6.1 Crear o editar una cita

**Rol para completar por la interfaz:** Administrador o Recepción. **Requisitos:** paciente y médico registrados; fecha, hora y motivo confirmados.

1. Abra “Citas médicas” y pulse “Nueva cita”, o la acción de editar de una cita existente.
2. Seleccione paciente y médico; revise fecha, hora, motivo y estado del formulario.
3. No confunda prioridad de agenda o notas con un triaje guardado.
4. Pulse “Guardar cita” o “Guardar cambios”.
5. Localice la cita en “Bandeja de citas” usando búsqueda y filtros, y compruebe sus datos.

**Resultado esperado:** cita visible con paciente, médico, horario y estado. **Problemas:** sin pacientes o médicos disponibles el formulario no puede completar el alta. Si falla la operación, revise la lista antes de crear otra cita. No se verificó eliminación automática de citas antiguas ni envío de recordatorios.

### 6.2 Actualizar estados y registrar ingreso

**Rol:** Administrador o Recepción para el recorrido de Recepción; Médico y Enfermería pueden cambiar estados mediante el selector de Citas médicas. Los botones de Recepción para Enfermería están ocultos por sus permisos de edición. **Requisito:** cita correcta identificada y cambio confirmado por el equipo.

1. En “Recepción”, revise las visitas del día y busque por paciente o doctor.
2. Para una cita pendiente pulse “Check-in”; pasa a confirmada.
3. Para una confirmada pulse “Llamar”; pasa a en curso. Es un cambio de estado, no una llamada telefónica automatizada.
4. Para una en curso pulse “Atendido”; pasa a completada.
5. En “Citas médicas”, el selector de estado permite seleccionar el estado que corresponda, incluida “Cancelada”, según autorización.

**Resultado esperado:** estado actualizado en la cita. **Problemas:** “Atendido” no crea por sí solo una visita médica. Recepción muestra solo el día actual; si una cita no aparece, compruebe fecha y zona horaria y búsquela en Citas médicas.

| Valor del registro | En Citas médicas | En Recepción |
| --- | --- | --- |
| pendiente | Pendiente | En espera |
| confirmada | Confirmada | Registrado |
| en_curso | En curso | Llamado |
| completada | Completada | Atendido |
| cancelada | Cancelada | Cancelada |

### 6.3 Registrar un ingreso del día sin cita previa

**Rol para completar por la interfaz:** Administrador o Recepción. **Requisitos:** paciente y médico existentes; revisar que no haya cita del mismo ingreso.

1. En “Recepción”, pulse “Registrar Visita”.
2. En “Registro de visita / Check-in”, seleccione paciente, médico, motivo y hora.
3. Pulse “Registrar” y compruebe la nueva fila.

**Resultado esperado:** se crea una cita del día con estado pendiente, aunque la pantalla la llame visita. **Problemas:** no genera la historia clínica formal; esa se registra en el flujo médico. Si la persona todavía no tiene identificación suficiente, utilice el procedimiento de Atención rápida.

La eliminación de citas requiere Administrador y confirmación en “Eliminar cita”. Para un cambio de agenda valore cancelar o editar conforme al procedimiento interno, evitando borrar evidencia sin revisión.

**[CAPTURA C05 PENDIENTE: cita, filtros y estados.]**

**[CAPTURA C06 PENDIENTE: Recepción y acciones Check-in, Llamar y Atendido.]**

## 7 Atención rápida

### 7.1 Abrir y vincular una atención

**Rol:** Administrador, Médico, Enfermería o Recepción para abrir y vincular; solo Administrador, Médico o Enfermería para iniciar/finalizar. **Requisito:** motivo de atención; identidad confirmada antes de vincular una ficha.

1. Abra “Atención rápida”. En “Nueva atención”, complete “Motivo de atención *”; “Nombre o referencia (opcional)” puede quedar vacío.
2. Pulse “Abrir atención rápida” y anote el código asignado, con formato `AR-…`.
3. El personal clínico usa “Iniciar atención” y después “Finalizar atención”, cuando corresponda.
4. Para identificar a la persona, pulse “Vincular paciente · [código]”, busque por nombre, seleccione la ficha y verifique su identificador.
5. Pulse “Confirmar vínculo”. Si falta la ficha, regístrela desde Pacientes con un rol habilitado y vuelva a buscar.

**Resultado esperado:** atención registrada, con estados Pendiente → En atención → Finalizada y, cuando proceda, ficha vinculada. **Problemas:** la búsqueda muestra hasta 100 coincidencias; acote el nombre. Un vínculo existente no puede sustituirse por otra persona mediante esta operación. Ante “La atención cambió, ya está vinculada o no existe. Actualiza la lista.”, pulse “Actualizar” y revise antes de repetir. Este registro no sustituye automáticamente cita, triaje o visita médica.

**[CAPTURA C07 PENDIENTE: atención ficticia y confirmación de vínculo.]**

## 8 Triaje y priorización

### 8.1 Registrar triaje

**Rol para guardar:** Administrador o Enfermería; Médico puede consultar. **Requisito:** cita activa y paciente confirmado. La lista de Triaje considera citas pendientes, confirmadas o en curso.

1. Abra “Triaje” y busque paciente, documento, doctor o motivo.
2. Pulse “Registrar triaje” o “Actualizar triaje” en la cita correcta.
3. Complete “Motivo de consulta *”, “Historia de la enfermedad actual”, “Antecedentes relevantes” y “Alergias referidas” según la valoración.
4. Registre “P/A”, “FC (lpm)”, “FR (rpm)”, “Temperatura C”, “SpO2 %” y “Peso kg” con las unidades de la pantalla. Añada “Observaciones de enfermeria”.
5. Si desea revisar el cálculo, pulse “Revisar prioridad antes de guardar”. Esta vista previa no guarda ni modifica la cola.
6. Revise prioridad, motivos y evidencia mostrados. Pulse “Guardar triaje” y compruebe el resultado.

**Resultado esperado:** triaje registrado y prioridad calculada disponible. **Problemas:** si el cálculo muestra una advertencia de servicio o una fuente alternativa, comuníquelo y revise clínicamente el resultado. La prioridad sugerida —Baja, Media, Alta o Critica— es apoyo a la decisión; debe confirmarla el personal clínico y no sustituye el protocolo asistencial.

### 8.2 Consultar Priorización

**Rol:** Administrador, Médico o Enfermería. **Requisito:** triajes registrados o datos para una simulación.

1. Abra “Priorización” y revise la cola, prioridad, puntaje y motivos disponibles.
2. Compruebe identidad y estado antes de seleccionar “Atender”, si está disponible.
3. Para explorar una valoración use el formulario de simulación y revise su resultado; no lo tome como prueba de que se guardó un triaje.
4. Solicite al Administrador cualquier recálculo global: el servidor reserva esa operación a ese rol.

**Resultado esperado:** información para organizar la atención. **Problemas:** abrir una consulta desde “Atender” requiere verificar el funcionamiento de esa ruta en la versión desplegada; vea sección 9. Ante una urgencia, siga el protocolo clínico sin esperar el cálculo del sistema.

**[CAPTURA C08 PENDIENTE: formulario de triaje y vista previa.]**

**[CAPTURA C09 PENDIENTE: cola con prioridad, evidencia y advertencia de servicio, si existe.]**

## 9 Expedientes y consulta

### 9.1 Registrar una visita médica

**Rol para guardar:** Administrador o Médico. Enfermería accede a Expedientes, pero el servidor no autoriza crear o modificar visitas. **Requisitos:** paciente, médico y valoración clínica; comprobar primero si la cita ya tiene visita.

1. Para una cita existente, abra “Citas médicas” y pulse “Abrir visita” en la cita correcta. Si indica “Ya convertida a visita”, consulte la visita existente.
2. Complete el formulario y pulse “Crear visita”. No convierta dos veces el mismo ingreso.
3. Para una visita independiente use “Expedientes” → “Nueva visita”. Complete “Paciente *”, “Doctor *”, “Fecha *”, “Hora *”, “Costo consulta *”, “Motivo *” y “Diagnostico *”.
4. En el formulario de Expedientes registre historia de la enfermedad, antecedentes, signos vitales, examen físico, impresión clínica y tratamiento. Complete “Conducta”, “Tipo de atencion”, indicaciones y “Egreso o referencia” cuando corresponda.
5. Revise paciente, fecha, diagnóstico y costo antes de “Guardar visita”.
6. Busque y abra el detalle de la visita para comprobar su información y registros asociados.

**Resultado esperado:** visita médica persistida y disponible en Expedientes. **Problemas:** una cita cancelada no ofrece conversión. Un diagnóstico obligatorio vacío impide completar el registro. Si existe una visita, no cree otra para corregir datos sin revisar el caso con el responsable.

### 9.2 Consultar historia y verificar una impresión

**Rol de consulta:** Administrador, Médico o Enfermería. **Requisito:** paciente y visita identificados.

1. En “Expedientes”, busque el paciente o visita y abra su detalle.
2. Revise historia, antecedentes, valoración, egreso y órdenes o prescripciones relacionadas que estén disponibles.
3. Contraste la visita con el triaje y la atención actual antes de tomar decisiones.

**Resultado esperado:** información clínica del registro seleccionado. **Problemas y límite:** la ruta adicional `/consulta/:appointmentId` tiene una integración pendiente en el código revisado: el componente espera un identificador recibido como propiedad y la ruta no se lo proporciona explícitamente. Además, su previsualización de receta usa nombre de médico, duración e instrucciones predeterminados. Por ello no se presenta ese recorrido ni “Imprimir Receta Profesional” como salida clínica validada. Antes de entregar cualquier receta impresa se deben comprobar médico, medicamento, dosis, frecuencia, duración e instrucciones contra una prescripción real. Use Expedientes y Prescripciones para el registro documentado y solicite revisión técnica si esa consulta no abre.

**[CAPTURA C10 PENDIENTE: creación de visita y detalle clínico sin datos reales.]**

## 10 Prescripciones y Farmacia

### 10.1 Registrar una prescripción

**Rol:** Administrador o Médico. **Requisito:** visita guardada; indicación clínica completa; producto de farmacia existente si se va a dispensar del inventario.

1. Abra “Prescripciones” y pulse “Nueva prescripcion”.
2. Seleccione “Visita asociada *” y compruebe paciente y diagnóstico.
3. En “Producto de farmacia”, seleccione un producto si la entrega saldrá del inventario. Indique “Cantidad *”. El costo vinculado se calcula desde el catálogo.
4. Si no se dispensará desde farmacia, seleccione “No dispensar desde farmacia (costo manual)” y revise el costo manual; no deje el valor inicial sin comprobarlo.
5. Complete “Medicamento *”, “Dosis *”, “Frecuencia *”, duración e instrucciones según la prescripción.
6. Pulse “Guardar prescripcion” y verifique la fila, costo y estado de dispensación.

**Resultado esperado:** prescripción vinculada a la visita. **Problemas:** guardar no equivale a entregar medicamento. Una existencia insuficiente puede requerir entrega parcial. Una prescripción sin producto vinculado no representa una salida automática de farmacia.

### 10.2 Dispensar medicamento

**Rol:** Administrador o Enfermería. Fundación tiene acceso de consulta a Farmacia. **Requisitos:** prescripción vinculada a producto, existencia disponible e identidad e indicación verificadas.

1. Abra “Farmacia” y revise la sección de prescripciones pendientes de dispensación.
2. Confirme paciente, medicamento, indicación, cantidad ya dispensada, pendiente y existencia.
3. Introduzca la cantidad a entregar en “Cantidad a dispensar para [paciente]”.
4. Pulse “Dispensar” y compruebe cantidades, estado y existencia después de la operación.

**Resultado esperado:** entrega registrada y existencias actualizadas según cantidad dispensada. **Problemas:** no entregue por encima de la existencia o de la cantidad pendiente. Si se interrumpe la respuesta, consulte el estado antes de repetir. Para una entrega de una prescripción use este flujo, evitando registrar además una salida manual que duplique el descuento.

**[CAPTURA C11 PENDIENTE: prescripción con producto y costo calculado.]**

**[CAPTURA C12 PENDIENTE: dispensación parcial con cantidades ficticias.]**

## 11 Laboratorio

### 11.1 Crear una orden

**Rol:** Administrador o Médico. **Requisitos:** paciente y examen confirmado; cita o visita asociada si corresponde; costo revisado.

1. Abra “Laboratorio” → “Nueva orden”, o “Orden laboratorio” desde una cita no cancelada.
2. Seleccione “Paciente *”, “Cita origen” y “Visita asociada” cuando corresponda.
3. Complete “Examen solicitado *”, “Prioridad” —Normal, Alta o Urgente— y “Costo *”.
4. Pulse “Crear orden” y compruebe la orden en “Bandeja de laboratorio”.

**Resultado esperado:** orden registrada. **Problemas:** Enfermería puede ver acciones de creación por la matriz de interfaz, pero el servidor no permite crear órdenes con ese rol. No cambie paciente, cita o visita para sortear un error: solicite revisión del vínculo.

### 11.2 Actualizar estado y registrar resultado

**Rol:** Administrador, Médico o Enfermería para cambiar estado; solo Administrador para crear o editar resultados en el servidor actual. **Requisito:** orden correcta y resultado confirmado por el responsable clínico.

1. En la bandeja busque la orden y compruebe paciente, examen y prioridad.
2. Use el selector de estado conforme al trabajo realizado. Los estados registrados son `pendiente`, `en_proceso`, `resultado_cargado` y `validado`.
3. El Administrador pulsa “Cargar resultado” o “Editar resultado” en la orden, completa “Resultado *”, “Observaciones” y “Validado por” según corresponda y pulsa “Guardar resultado”.
4. Compruebe el resultado guardado y el estado final visible; no dé por validada una prueba solo porque se haya escrito un texto.

**Resultado esperado:** estado y resultado disponibles para consulta. **Problemas:** si Médico o Enfermería ven el formulario pero reciben una restricción al guardar resultados, corresponde a los permisos actuales. El texto “Validado por” no sustituye el proceso de revisión clínica del centro. Fundación tiene acceso de consulta al módulo, no autorización de escritura.

**[CAPTURA C13 PENDIENTE: orden, estados y resultado con cuenta Administrador de prueba.]**

## 12 Inventarios

### 12.1 Administrar insumos de laboratorio

**Rol:** Administrador para crear/editar ficha; Administrador o Enfermería para movimientos; Fundación para consulta. **Requisitos:** identificar insumo, unidad, cantidad y motivo real del movimiento.

1. Abra “Insumos de laboratorio”; también hay inventario de insumos dentro de Laboratorio.
2. Para crear, el Administrador pulsa “Nuevo insumo”, completa nombre, categoría, unidad, stock, stock mínimo y fecha de vencimiento y guarda el formulario.
3. Para una entrada o salida, pulse “Movimiento”, seleccione “Tipo”, indique “Cantidad *” y “Motivo” y pulse “Registrar”.
4. Compruebe la existencia resultante y revise alertas de stock bajo, vencidos o por vencer.

**Resultado esperado:** ficha o movimiento guardado y stock actualizado. **Problemas:** Enfermería puede ver “Editar” pero el servidor reserva la edición de la ficha al Administrador; use Movimiento para entradas y salidas autorizadas. Las alertas se consultan en pantalla, no prueban que se haya enviado correo o SMS.

### 12.2 Administrar Inventario general o productos de Farmacia

**Rol:** Administrador o Enfermería para escritura; Fundación para consulta. **Requisitos:** módulo correcto, código de producto y cantidades verificadas.

1. Abra “Inventario general” o “Farmacia”. Busque por nombre, código o categoría; active “Solo stock bajo” si lo necesita.
2. Para alta pulse “Nuevo producto”, complete código, nombre, categoría, unidad, proveedor si corresponde, existencia inicial, stock mínimo, precio o costo unitario y vencimiento.
3. Pulse “Guardar producto” y compruebe la fila.
4. Para un movimiento pulse “Movimientos” en el producto, indique Entrada o Salida, cantidad y motivo; pulse “Registrar movimiento”.
5. Verifique las existencias. En Farmacia, utilice el procedimiento de dispensación para entregas asociadas a recetas.

**Resultado esperado:** catálogo y existencias actualizados. **Problemas:** compruebe el módulo antes de registrar: los insumos de laboratorio y los productos de inventario/farmacia utilizan catálogos distintos. No repita un movimiento ante una respuesta dudosa sin verificar su efecto.

**[CAPTURA C14 PENDIENTE: insumo, movimiento y alertas.]**

**[CAPTURA C15 PENDIENTE: producto y movimiento de Inventario general.]**

## 13 Documentos

### 13.1 Adjuntar y descargar

**Rol:** Administrador, Médico o Enfermería; solo Administrador para eliminar. **Requisitos:** paciente registrado y archivo pertinente autorizado para su expediente.

1. Abra “Documentos” → “Adjuntar documento”.
2. Seleccione “Paciente” y revise su identidad.
3. Seleccione “Archivo (PDF, JPG, PNG o TXT; hasta 5 MB)” y añada “Descripción” cuando corresponda.
4. Pulse “Guardar documento” y compruebe “Documento guardado.” y la fila en la tabla.
5. Para recuperar el archivo use “Buscar paciente, archivo o descripción” y “Descargar”.

**Resultado esperado:** archivo asociado a la ficha y descargable. **Problemas:** reduzca tamaño o use un formato admitido si se rechaza. No adjunte archivos de otro paciente. La eliminación requiere confirmación; un archivo descargado queda bajo responsabilidad de quien lo almacena.

**[CAPTURA C16 PENDIENTE: carga y tabla con un PDF ficticio.]**

## 14 Cuentas y pagos

### 14.1 Consultar cargos y registrar un pago

**Rol:** Administrador, Recepción o Fundación. **Requisitos:** cargo existente del paciente correcto; pago recibido y monto confirmado.

1. Abra “Cuentas y pagos” y revise “Bandeja de cargos”. Use búsqueda, estado y origen: Consulta, Laboratorio o Farmacia.
2. Confirme paciente, descripción, total, pagado y saldo del cargo.
3. Pulse “Registrar pago” en ese cargo.
4. Complete “Monto *” y “Metodo *” —Efectivo, Tarjeta o Transferencia—; añada referencia y observaciones si corresponden. Revise el monto propuesto antes de aceptar. El formulario no ofrece edición de fecha/hora del pago.
5. Pulse “Registrar pago” y espere la confirmación.
6. Compruebe el nuevo saldo y la fila en “Pagos recientes”.

**Resultado esperado:** pago aplicado al cargo y estado `pendiente`, `parcial` o `pagado`, según saldo. **Problemas:** el pago debe ser mayor que cero y no exceder el saldo. El servidor rechaza cargos inexistentes, ya pagados o de otro paciente. Si otra persona cobra al mismo tiempo, revise el saldo actual antes de reintentar. No se identificó un procedimiento de anulación o reembolso de pagos en esta pantalla; solicite revisión administrativa en caso de error.

Los cargos están relacionados con consultas, laboratorio y farmacia. Verifique sus datos de origen si falta o parece duplicado un cargo; no cree otra visita o receta únicamente para producir un cobro. “Facturado” en los indicadores describe cargos del sistema y no demuestra certificación fiscal.

### 14.2 Obtener estado de cuenta

**Rol para completar la descarga:** Administrador o Recepción. Fundación puede ver el botón, pero el servidor restringe este documento a esos dos roles. **Requisito:** paciente con cargos identificado.

1. En el cargo del paciente pulse “Estado de cuenta (PDF)”.
2. Espere que se genere y abra el documento; permita la apertura del navegador cuando corresponda.
3. Revise paciente, cargos, pagos y saldo antes de imprimir o entregar.

**Resultado esperado:** PDF del estado de cuenta disponible. **Problemas:** si aparece “No se pudo abrir el estado de cuenta.” o error de generación, revise conexión y permiso; no interprete el fallo como saldo cero. No se ha comprobado en producción la generación ni el diseño de este PDF.

### 14.3 Alcance de Facturación SAT

La pantalla “Facturación SAT” está accesible para Administrador y Fundación, pero el código revisado usa datos de demostración y genera identificadores de autorización aleatorios en memoria. No se comprobó una integración de certificación FEL. Por tanto, este manual no instruye a emitir ni anular facturas fiscales desde ella. Solicite a la administración el procedimiento fiscal vigente y no entregue esas simulaciones como documentos certificados.

**[CAPTURA C17 PENDIENTE: cargo, pago parcial y saldo con datos ficticios.]**

**[CAPTURA C18 PENDIENTE: estado de cuenta generado con datos ficticios y permiso autorizado.]**

## 15 Doctores y Reportes

### 15.1 Consultar o registrar un médico

**Rol:** Administrador, Médico, Enfermería o Fundación para consultar; Administrador para alta, edición o eliminación. **Requisitos:** datos profesionales confirmados y evitar duplicar el registro.

1. Abra “Doctores”, busque y consulte el registro existente.
2. Si falta, el Administrador pulsa “Nuevo Medico”, completa los campos del formulario y pulsa “Registrar medico”.
3. Para corregir un registro, abra su edición y pulse “Guardar cambios”.
4. Compruebe que aparezca correctamente en los selectores de las citas.

**Resultado esperado:** catálogo de médicos disponible. **Problemas:** un registro profesional no equivale automáticamente a una cuenta para ingresar; esta se crea en Configuración. Antes de eliminar, revise con el responsable las referencias de citas y visitas existentes.

### 15.2 Consultar indicadores

**Rol de acceso:** Administrador, Médico o Fundación. **Requisito:** datos cargados sin advertencia. Administrador y Fundación tienen acceso a las fuentes solicitadas por esta pantalla; Médico tiene una limitación en las fuentes financieras.

1. Abra “Reportes” y espere la carga.
2. Compruebe que no aparezca “La analitica no se pudo sincronizar completamente.”.
3. Revise Pacientes, Facturado, Cobrado, Saldo pendiente, productividad, “Ingresos por origen” y “Estado de laboratorio”.
4. Contraste cualquier cifra usada para decisiones con el módulo de origen y el alcance de registros cargados.

**Resultado esperado:** resumen de los datos recibidos por la pantalla. **Problemas:** Reportes solicita conjuntamente datos clínicos y financieros; Médico no tiene permisos de cargos/pagos, lo que puede hacer fallar la carga completa. El conteo de pacientes usa la consulta de opciones, disponible también para Fundación, sin necesidad de abrir fichas. No trate los ceros mostrados tras un fallo como cifras reales. Los agregados se calculan en la interfaz sobre las listas recibidas; no se certifica que incluyan toda la base o un período contable concreto. No se identificó exportación de Reportes en esta pantalla.

**[CAPTURA C19 PENDIENTE: Reportes con carga completa y rol Administrador de prueba.]**

## 16 Configuración y usuarios

### 16.1 Actualizar datos del centro

**Rol:** Administrador. **Requisitos:** datos institucionales autorizados.

1. Abra “Configuración” → “General”.
2. Revise “Nombre del Centro Médico”, “RUT”, “Teléfono de Contacto”, “Email Institucional”, “Sitio Web”, “Dirección”, “Zona Horaria” e “Idioma”. El rótulo “RUT” se conserva tal como aparece; confirme internamente el dato institucional que debe introducirse.
3. Seleccione la zona aplicable al centro, por ejemplo `America/Guatemala`, y pulse “Guardar cambios”.
4. Compruebe “Configuración guardada en el servidor.” y vuelva a abrir la sección para verificar persistencia.

**Resultado esperado:** datos generales guardados. **Problemas:** use “Reintentar” si la configuración no cargó. Guardar idioma o zona horaria no demuestra por sí solo que todas las pantallas se traduzcan o cambien su formato; Recepción utiliza también la fecha local del navegador.

### 16.2 Crear y activar o desactivar cuentas

**Rol:** Administrador. **Requisitos:** autorización interna para otorgar acceso; médico existente si la cuenta requiere “Médico asociado”.

1. Abra “Configuración” → sección de usuarios y pulse “Nuevo usuario”.
2. Complete nombre, correo y contraseña del formulario; seleccione “Rol”. Para Médico seleccione “Médico asociado” cuando corresponda.
3. Revise que el rol coincida con las tareas del puesto y pulse “Crear usuario”.
4. Compruebe cuenta y estado en “Gestión de usuarios”.
5. Use la acción de activar o desactivar para habilitar o retirar acceso a otra cuenta, conforme a la autorización interna.

**Resultado esperado:** cuenta creada o estado actualizado. **Problemas:** un correo ya utilizado produce conflicto. El servidor impide desactivar la cuenta propia. No comparta contraseñas en capturas ni suponga que la creación de cuenta envía un correo automático.

### 16.3 Descargar respaldo y revisar auditoría

**Rol:** Administrador. **Requisitos:** ubicación segura para almacenar el respaldo y autorización para tratar la información exportada.

1. Abra “Configuración” → “Datos y Backup”.
2. Pulse “Descargar backup”, espere el resultado y compruebe que el archivo se descargó.
3. Revise “Ultimo respaldo” y los conteos mostrados para la exportación de esta sesión.
4. En “Auditoria reciente”, use “Recargar” para consultar movimientos y sus responsables.

**Resultado esperado:** respaldo descargado y eventos disponibles. **Problemas:** “Sin exportacion en esta sesion” no significa que nunca se haya hecho un respaldo. Una descarga no prueba que exista una restauración probada; no se documenta aquí una interfaz de restauración ni respaldos programados.

### 16.4 Notificaciones y apariencia

**Rol:** Administrador. **Requisito:** acceso a Configuración.

1. Abra “Notificaciones” para consultar el estado del servicio.
2. Considere vigente el aviso: “El envío de recordatorios por correo y SMS todavía no está integrado. No se activan envíos desde esta pantalla.”
3. Si necesita preferencias visuales, consulte la sección de apariencia y compruebe el cambio en el navegador usado.

**Resultado esperado:** conocimiento del alcance de avisos y opciones visibles. **Problemas:** registrar correo o teléfono de personal o pacientes no activa recordatorios, recetas ni mensajes. No se implementaron envíos como parte de este manual.

**[CAPTURA C20 PENDIENTE: General y confirmación de guardado.]**

**[CAPTURA C21 PENDIENTE: usuarios ficticios, roles y estados sin contraseñas.]**

**[CAPTURA C22 PENDIENTE: Datos y Backup y aviso de Notificaciones.]**

## 17 Problemas frecuentes

| Situación | Acción del usuario | Cuándo escalar |
| --- | --- | --- |
| No conecta o tarda demasiado | Revisar internet, esperar y reintentar la consulta | Persiste en varios módulos; registrar hora y mensaje |
| Sesión vencida o acceso solicitado de nuevo | Ingresar con su cuenta; revisar si la operación anterior quedó guardada | No permite volver a ingresar |
| Cuenta desactivada | Contactar al administrador | Requiere decisión sobre habilitación |
| Acceso denegado o 403 | Verificar el rol y el alcance descrito aquí | Botón visible que siempre rechaza la acción |
| Paciente, cita u orden no encontrados | Quitar filtros y revisar identidad, fecha e identificador | El registro confirmado sigue ausente |
| DPI inválido | Confirmar 13 dígitos; no inventar identidad | Persona sin identificación: seguir Atención rápida y protocolo interno |
| Posible duplicado | Detener el alta, buscar otras coincidencias | Entregar identificadores al responsable para revisión |
| No se pudo guardar | Leer el mensaje, revisar campos y consultar la lista antes de repetir | Datos válidos y fallo persistente |
| Pago rechazado | Revisar saldo, paciente y monto; no repetir cobro sin consulta | Pago recibido sin registro confirmado o importe incorrecto |
| Existencia insuficiente | Verificar conteo y cantidad pendiente | Diferencia con inventario físico o entrega ya realizada |
| Reportes muestra advertencia | No usar sus ceros como cifras reales; consultar origen | Administrador debe revisar permisos y carga |
| Consulta no abre o receta muestra datos genéricos | Usar Expedientes y Prescripciones; revisar sección 9 | Revisión técnica antes de entregar impresos |
| No llega correo o SMS | Tener presente que el envío no está integrado | Necesidad operativa de un canal que aún no existe |

## 18 Privacidad y soporte

Use una cuenta individual y consulte únicamente la información necesaria para su trabajo. Verifique la ficha antes de escribir, adjuntar o entregar documentos. Mantenga la pantalla fuera de la vista de terceros y cierre sesión al retirarse. Proteja descargas, estados de cuenta, documentos clínicos y respaldos con los controles internos del centro. No comparta datos por canales personales sin autorización.

Para reportar un problema, comuníquese con el administrador o responsable interno designado. Informe módulo, fecha y hora de Guatemala, rol, acción, mensaje exacto y si hay duda sobre un guardado o cobro. Use identificadores internos por un canal autorizado y oculte datos personales en capturas; nunca envíe contraseñas, tokens o archivos de respaldo completos como evidencia ordinaria.

No se proporcionó un contacto de soporte verificado. **Pendiente administrativo:** completar nombre del responsable, canal autorizado y horario de atención antes de distribuir la edición definitiva. Las reglas de retención, corrección de historia, eliminación y atención durante una caída deben establecerse en el protocolo del centro; este manual no inventa plazos ni garantiza recuperación automática.

## 19 Capturas pendientes

Los marcadores C01 a C22 son solicitudes de evidencia, no capturas tomadas. Prepare cuentas de prueba de cada rol y registros ficticios en un entorno autorizado. Antes de capturar, retire nombres, DPI, teléfonos, correos, credenciales y datos clínicos reales. No use la producción para generar datos de demostración sin autorización.

| Grupo | Capturas | Evidencia requerida |
| --- | --- | --- |
| Acceso y navegación | C01–C02 | Pantalla de ingreso y menú según rol |
| Registro e ingreso | C03–C07 | Búsqueda, ficha, cita, estados, ingreso del día y vínculo de atención rápida |
| Atención clínica | C08–C10 | Triaje, prioridad y detalle de visita guardada |
| Operación | C11–C16 | Prescripción, entrega parcial, resultado, insumos, productos y documentos |
| Finanzas y reportes | C17–C19 | Pago parcial, saldo, PDF de cuenta y carga completa de indicadores |
| Administración | C20–C22 | Persistencia de datos generales, usuarios, respaldo y aviso de envíos pendientes |

Cada captura debe indicar versión desplegada, fecha, rol y qué resultado acredita. Si una pantalla difiere, actualice procedimiento y captura juntos. No capture la simulación SAT como prueba de certificación FEL.

## 20 Validación y fuentes

### 20.1 Alcance de la comprobación realizada

Se revisaron rutas del frontend, menú, roles, matriz de botones, formularios y llamadas a la API; se contrastaron con restricciones de rutas del backend y validaciones de servicios relevantes. Es una revisión estática. No se inició sesión, no se ejecutaron flujos en navegador, no se consultó la base de datos, no se modificó la aplicación y no se desplegó. No se comprobó que Vercel, Render y Neon estén conectados a esta revisión ni que los servicios auxiliares respondan en producción.

### 20.2 Pendientes antes de aprobar la versión operativa

- [ ] Registrar URL oficial y revisión desplegada de frontend y backend; comparar con la base de este manual.
- [ ] Probar con cuentas de cada rol el menú y las acciones efectivas. Revisar discrepancias entre interfaz y servidor indicadas en secciones 2, 5, 6, 9, 11, 12, 14 y 15.
- [ ] Validar recorrido paciente → cita → triaje → visita → prescripción/orden → cargo → pago, usando datos ficticios autorizados.
- [ ] Validar ingreso del día y Atención rápida, incluidos cambios concurrentes y vínculo de identidad.
- [ ] Verificar asociación de consulta con cita y eliminar de cualquier salida clínica datos predeterminados de demostración antes de autorizar ese recorrido.
- [ ] Confirmar persistencia después de recargar, fechas y zona horaria en las pantallas utilizadas.
- [ ] Comprobar laboratorio, dispensación parcial, existencias y efecto financiero de los registros.
- [ ] Probar descargas de documentos, estado de cuenta y respaldo; revisar contenido y permisos.
- [ ] Confirmar alcance de indicadores y resolver advertencias de Reportes antes de usarlos como cifras institucionales.
- [ ] Mantener Facturación SAT fuera del procedimiento fiscal hasta verificar una integración real.
- [ ] Incorporar capturas C01 a C22 y contacto interno de soporte.
- [ ] Obtener revisión operativa de Recepción, Enfermería, Médico y Administración y registrar aprobación de la edición definitiva.

### 20.3 Mapa de fuentes para mantenimiento

Rutas relativas al repositorio, para que el responsable técnico pueda actualizar este manual:

| Contenido | Fuentes revisadas |
| --- | --- |
| Flujo y alcance | `README.md`; `frontend/src/app/routes.tsx` |
| Menú y permisos | `frontend/src/app/components/layout/Sidebar.tsx`; `frontend/src/app/auth/roles.ts`; `frontend/src/app/auth/permissions.ts` |
| Acceso y cuenta | `frontend/src/app/pages/Login.tsx`; `Account.tsx`; `frontend/src/app/components/ChangePasswordForm.tsx`; `backend/src/modules/auth/auth.routes.js` |
| Pacientes | `frontend/src/app/pages/Patients.tsx`; `backend/src/modules/pacientes/pacientes.routes.js`; `pacientes.service.js` |
| Citas e ingreso | `frontend/src/app/pages/Appointments.tsx`; `Recepcion.tsx`; `QuickCare.tsx`; rutas backend de `citas` y `atenciones` |
| Triaje y visitas | `frontend/src/app/pages/Triage.tsx`; `Prioritization.tsx`; `MedicalRecords.tsx`; `Consultation.tsx`; rutas backend de `triajes`, `analisis` y `visitas` |
| Medicación y existencias | `frontend/src/app/pages/Prescriptions.tsx`; `Farmacia.tsx`; `Inventario.tsx`; `Inventory.tsx`; componentes `ProductInventory.tsx` y `PendingDispensations.tsx`; rutas backend de `prescripciones`, `productos` y `laboratorio` |
| Laboratorio y archivos | `frontend/src/app/pages/Laboratory.tsx`; `Documentos.tsx`; rutas backend de `laboratorio` y `documentos` |
| Finanzas e indicadores | `frontend/src/app/pages/Billing.tsx`; `Reports.tsx`; `Facturacion.tsx`; `frontend/src/app/api/billing.ts`; rutas backend de `cargos` y `pagos` |
| Administración | `frontend/src/app/pages/Doctors.tsx`; `Settings.tsx`; rutas backend de `medicos`, `configuracion`, `auth`, `backups` y `auditoria` |

**Control de edición:** versión 0.1 creada el 30 de octubre de 2026. Próxima edición: incorporar evidencia del despliegue y resolver o confirmar los límites identificados. Responsable de aprobación: pendiente de designación por el centro.
