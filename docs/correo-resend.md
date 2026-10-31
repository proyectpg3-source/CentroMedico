# Correos administrativos con Resend

La aplicación implementa solicitudes reales a Resend desde el backend Express. No requiere un microservicio. Los envíos se solicitan desde **Correos**, después de guardar el registro en su módulo. No se envían mensajes automáticamente al registrar personas o cambiar citas: el operador debe revisar el texto y confirmar el correo y la autorización del titular. El paciente sin correo puede seguir registrándose normalmente.

## Activación en Render

1. Verificar en Resend el dominio del remitente y crear una clave para envíos. No guardar ni compartir la clave en el repositorio, el frontend o el chat.
2. Configurar las variables del servicio backend:

   ```env
   EMAIL_ENABLED=true
   RESEND_API_KEY=<clave de Resend>
   EMAIL_FROM=Centro Médico La Aurora <avisos@dominio-verificado>
   APP_URL=https://<frontend-publicado>
   PUBLIC_API_URL=https://<backend-publicado>
   ```

3. Mantener `JWT_SECRET` configurado; firma los enlaces limitados al estado de cuenta. Reiniciar o desplegar el backend con la nueva configuración. El esquema añade `notificaciones_correo` al iniciar: incluye esta migración aditiva en la revisión del despliegue. No se ha ejecutado contra Neon como parte de la implementación.
4. Desplegar el frontend con su `VITE_API_BASE_URL` correspondiente.
5. Usar una dirección de prueba propia autorizada. Revisar respuesta, registro en Resend y recepción efectiva. Una aceptación del proveedor no demuestra entrega al buzón.

En Docker Compose se pasan las mismas cinco variables desde el entorno de ejecución o el archivo `.env` de Compose. Las claves no se incorporan a la imagen ni al frontend.

Si faltan la activación, la clave o el remitente, el aviso queda **pendiente**. Una vez configurado, se puede revisar y reintentar desde Correos. La aplicación no envía pruebas por sí sola.

## Procedimiento

1. Guardar el paciente, cuenta del personal o cita en el módulo correspondiente.
2. Abrir Correos y elegir el tipo de aviso. Buscar por nombre y seleccionar el registro guardado.
3. Revisar destinatario, asunto y texto. La dirección se toma del registro; no puede sustituirse por un correo arbitrario desde esta pantalla. Corregir la ficha primero si está mal.
4. Confirmar que el titular autorizó el aviso y que esa dirección le pertenece. La comprobación de formato no demuestra propiedad.
5. Pulsar Enviar correo, o Guardar aviso pendiente cuando no esté activado.
6. Revisar el estado. Para un fallo o respuesta desconocida, usar Revisar y reintentar; no volver a crear el paciente o usuario.

| Aviso | Roles |
| --- | --- |
| Bienvenida a personal | Administrador |
| Registro de paciente y cita confirmada o reprogramada | Administrador, Recepción, Enfermería |
| Acceso al estado de cuenta | Administrador, Recepción |

Los operadores ven sus propios avisos. Administrador puede ver y reintentar todos. No se incluyen diagnósticos, motivos de consulta, resultados, DPI ni contraseñas en las plantillas. La bienvenida al personal remite al acceso normal y al administrador; no implementa activación ni recuperación de contraseñas. Los correos se dirigen al campo de email del titular registrado; no se implementa un destinatario responsable alternativo sin un registro de autorización específico.

## Estados y reintentos

Se persiste cada solicitud antes de contactar al proveedor. Los estados son pendiente, enviando, aceptado, fallido y desconocido. “Aceptado” indica aceptación por Resend; no se afirma entrega, apertura o lectura. No se implementan webhooks de entrega en esta versión.

La clave única del evento impide dobles avisos del mismo registro/destinatario. Para citas incluye el horario y estado actuales. El aviso del estado de cuenta se limita a uno por paciente, destinatario y día UTC. Se conserva exactamente el mensaje del primer intento y se usa `Idempotency-Key` al reintentar. Un timeout deja estado desconocido. Solo se reintenta durante las 23 horas posteriores al primer intento, dentro de las 24 horas que Resend conserva la clave; después exige revisión manual en el proveedor. Nunca se marca un envío desconocido como fallido con certeza ni se cambia su clave para reenviarlo. Si cambia el destinatario o la cita, se bloquea el reintento del contenido antiguo.

No hay proceso automático que consuma pendientes: los reintentos son explícitos, autorizados y limitados a diez intentos por minuto por operador. Los fallos de correo no modifican pacientes, cuentas o citas ya guardados.

## Enlace al estado de cuenta

Se añade un enlace HTTPS firmado, con alcance únicamente al PDF del paciente, caducidad de 24 horas y referencia al aviso persistido. No crea una cuenta de paciente ni permite consultar otros expedientes. Al abrirlo se verifica la firma, el propósito, la vigencia y que el correo actual del paciente siga coincidiendo con el destinatario autorizado. Las respuestas PDF se sirven con `Cache-Control: no-store` y `Referrer-Policy: no-referrer`. El acceso se audita sin registrar el token.

Quien posea el enlace podrá consultar el PDF durante su vigencia: no se debe compartir. El enlace no es de un solo uso para permitir volver a abrirlo durante ese plazo. Cambiar el correo de la ficha invalida el acceso; rotar `JWT_SECRET` también invalida los enlaces, además de las sesiones JWT existentes. El PDF contiene información financiera y debe enviarse solo a la persona autorizada.

## Operación y conservación

`notificaciones_correo` contiene destinatarios y el mensaje necesario para reintentos. Debe protegerse como dato personal; no se expone el cuerpo ni el enlace en el historial de la API. Incluir la tabla en respaldos completos de PostgreSQL. El respaldo administrativo JSON anterior no es una copia integral de esta cola. No borrar su historial sin una política: eliminar claves de eventos puede permitir nuevos avisos duplicados. No se introduce un plazo automático de eliminación.

El manual Word y REQ-0018 anteriores describen el estado previo o la propuesta. Este documento registra el alcance implementado, incluidas las diferencias de automatización y activación. La integración y las pruebas aisladas no sustituyen la validación del proveedor y del entorno desplegado.

Fuentes del contrato del proveedor: [enviar correo](https://resend.com/docs/api-reference/emails/send-email) y [claves de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).
