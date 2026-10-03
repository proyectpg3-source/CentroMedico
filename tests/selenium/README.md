# Pruebas automatizadas de login — CentroMedico

Herramienta: Selenium 4 con Python y Microsoft Edge.

## Casos definidos
1. Login correcto (automatizado): entrar con cuenta temporal, mostrar menú privado y crear sesión.
2. Login incorrecto (automatizado): rechazar contraseña incorrecta y mostrar mensaje sin crear sesión.
3. Campos vacíos (automatizado): bloquear envío mediante campos obligatorios del navegador.
4. Registro válido (pendiente): guardar paciente con datos completos y verificarlo en listado.
5. Registro inválido (pendiente): rechazar paciente sin datos obligatorios y no guardarlo.

## Repetir paso a paso
1. Mantener PostgreSQL encendido.
2. En una terminal, entrar a `backend` y ejecutar `npm start`.
3. En otra terminal, entrar a `frontend` y ejecutar `npm run dev`. Confirmar que abre en http://localhost:5173.
4. Abrir una tercera terminal en `tests/selenium`.
5. Crear un entorno de Python: `py -m venv .venv`.
6. Instalar: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`.
7. Ejecutar: `.\.venv\Scripts\python.exe test_login.py`.
8. Abrir `resultados/reporte.html`. Incluye resultados y capturas. `resultados.json` conserva los datos de la ejecución.

El primer arranque necesita internet para que Selenium Manager descargue el controlador de Edge. Node y las dependencias del backend deben estar instalados. No se pide tu contraseña: fixture.cjs crea una cuenta temporal aleatoria y la elimina al finalizar. Los casos no registran pacientes ni modifican cuentas existentes.

## Cómo explicar el código
- `fixture.cjs`: prepara la cuenta de prueba en PostgreSQL y la elimina después.
- `run_case`: abre un navegador independiente, ejecuta un caso, captura la pantalla y registra PASADO/FALLIDO.
- `WebDriverWait`: espera que aparezca un elemento o se complete una navegación.
- `assert`: compara el resultado real con el esperado. Si no coincide, el caso falla.
- `finally`: cierra el navegador y limpia la cuenta temporal incluso si una prueba falla.

Las pruebas usan frontend, backend y PostgreSQL reales. La cobertura es del login, no del sistema completo.
Referencia: https://www.selenium.dev/documentation/webdriver/getting_started/first_script/
