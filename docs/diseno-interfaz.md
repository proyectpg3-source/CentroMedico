# Diseño de interfaz de CentroMedico

## Dirección visual

Interfaz de trabajo clínico legible y sobria. Se conserva la identidad de La Aurora: verde esmeralda, azul oscuro y superficies blancas. La navegación identifica áreas; los colores de triaje mantienen su significado clínico.

Consulta local de UI UX Pro Max: `medical dashboard`, dominio `product`, resultado `Medical Clinic`. Se adopta su orientación de accesibilidad y minimalismo. La generación general también propuso una landing y neumorfismo: esas recomendaciones no encajan con la operación clínica y no se aplicaron.

## Convenciones

- Paleta existente: principal `#047857`, navegación `#0b132b`, fondo `#f3f6f7`, texto `#0f172a`, superficie `#ffffff`, acento `#e1f5ee`.
- Tipografía local Segoe UI/system-ui; no requiere descargar fuentes. Texto de campos a 16 px en móvil.
- Botones compartidos y campos de una línea con altura mínima de 44 px. Foco visible, etiquetas y controles nativos.
- Encabezados alineados a la izquierda; contenido de módulos limitado a 1600 px, márgenes adaptables de 16–32 px.
- Tablas con encabezados diferenciados, espacio vertical consistente y desplazamiento horizontal en su contenedor cuando corresponda.
- Iconos Lucide; animación discreta y respeto a movimiento reducido.
- Acceso: formulario oscuro centrado, como en el diseño original. Sin texto promocional ni bloque lateral, por preferencia del usuario. Altura adaptable a la pantalla y desplazamiento cuando el contenido lo necesita.

## Implementación

`frontend/src/styles/clinic-polish.css` reúne los ajustes visuales compartidos. `Login.tsx` utiliza los bloques de identidad y formulario. Los componentes Button e Input ofrecen dimensiones consistentes. El menú distingue inventario general de insumos de laboratorio.

## Verificación

- Compilación Vite correcta; persiste advertencia de tamaño del paquete JavaScript.
- Script existente `frontend/scripts/check-ui.cjs` ejecutado con Edge y todas las solicitudes API interceptadas.
- Comprueba formulario vacío, error de credenciales, mostrar contraseña, menú colapsado, navegación móvil, foco al cerrar, búsqueda por teclado, filtro de módulos por rol y estado de datos no disponibles.
- Comprueba ausencia de desbordamiento horizontal en vistas de 320, 390, 768, 1024 y 1440 px y ausencia de errores JavaScript durante ese recorrido.
- Capturas revisadas de login de escritorio y móvil, dashboard móvil y citas de escritorio en `output/ui-polish`.

Estas comprobaciones no certifican todos los módulos, el modo oscuro completo, lectores de pantalla ni la integración con la base de datos. Los cambios se superponen a modificaciones locales ya existentes, que se conservaron.

## Pulido del dashboard y navegación

- Dirección: herramienta de trabajo clínico sobria; se conserva el login oscuro centrado. Se aplica el criterio contextual de taste-skill para simplificar y preservar la identidad, complementado por UI UX Pro Max para las pantallas de datos.
- Dashboard: indicadores reunidos en una franja con separadores, cuadrícula de dos columnas en móvil y accesos rápidos filtrados por el rol de la sesión. Los gráficos sin información tienen mensajes de estado; la confirmación final distingue información incompleta.
- Navegación: prioridad dentro de atención clínica; reportes y configuración en administración. Marca y cuenta permanecen visibles mientras se desplaza el menú. Encabezados muestran la ubicación del módulo.
- Componentes compartidos: tamaño y desplazamiento de diálogos adaptados al viewport; botones principales usan el color de marca en las páginas revisadas, conservando alertas y colores de prioridad.
- Configuración: las celdas anchas solo abarcan dos columnas desde el breakpoint sm; en móvil no generan columnas implícitas estrechas. Etiquetas asociadas a los ocho campos generales.
- Verificación final: Vite build correcto, con advertencia existente de paquete mayor de 500 kB. Script check-ui aprobado en Edge, API completamente simulada, login y 18 módulos en escritorio de 1440 px y móvil de 390 px. Añade comprobaciones de accesos rápidos por rol, gráfico vacío y ancho legible de los campos de configuración.
- Capturas de este recorrido en `output/ui-taste-review`. Se inspeccionaron visualmente dashboard de escritorio y móvil, pacientes móvil, laboratorio escritorio, farmacia móvil y configuración móvil. La prueba no verifica cada formulario, operación de negocio ni datos reales.

## Ajuste con taste-skill

Instalada desde Leonxlnx/taste-skill, carpeta skills/taste-skill, con nombre interno design-taste-frontend. Se aplica su criterio contextual de preservar la identidad y evitar decoración innecesaria al acceso. Se mantienen los componentes actuales y no se trasladan patrones de marketing al dashboard clínico. Se quitó el bloque promocional y se restauró la tarjeta oscura centrada. Se conservaron campos legibles, foco visible y mostrar contraseña. Las pruebas aisladas de navegador volvieron a pasar; capturas en output/ui-centered-login.
