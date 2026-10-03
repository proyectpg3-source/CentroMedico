"""Pruebas de login: Selenium + Edge, contra la API y PostgreSQL reales.
Ejecutar con frontend y backend encendidos: python test_login.py
"""
import os, json, uuid, secrets, subprocess, sys, html
from pathlib import Path
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

HERE = Path(__file__).resolve().parent
OUT = Path(os.environ.get('E2E_OUTPUT', str(HERE / 'resultados')))
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('E2E_BASE_URL', 'http://localhost:5173').rstrip('/')
EMAIL = 'selenium-' + str(uuid.uuid4()) + '@example.invalid'
PASSWORD = secrets.token_urlsafe(18)
env = {**os.environ, 'E2E_EMAIL': EMAIL, 'E2E_PASSWORD': PASSWORD}
results = []

def fixture(action):
    # La contraseña se transmite por entorno y no se imprime ni guarda en el reporte.
    subprocess.run(['node', str(HERE / 'fixture.cjs'), action], env=env, check=True, capture_output=True)

def run_case(name, description, action):
    # Cada caso abre un navegador independiente para evitar sesiones compartidas.
    options = webdriver.EdgeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--window-size=1366,900')
    options.add_argument('--disable-gpu')
    # Solo para el navegador temporal ejecutado dentro de un entorno ya aislado.
    if os.environ.get('E2E_ISOLATED_RUNNER') == '1':
        options.add_argument('--no-sandbox')
    options.add_argument('--no-first-run')

    driver = None
    status, detail = 'PASADO', description
    shot = name + '.png'
    try:
        driver = webdriver.Edge(options=options)
        driver.get(BASE + '/login')
        wait = WebDriverWait(driver, 15)
        wait.until(EC.visibility_of_element_located((By.ID, 'login-email')))
        action(driver, wait)
        driver.save_screenshot(str(OUT / shot))
    except Exception as error:
        status, detail = 'FALLIDO', str(error).split('Stacktrace:')[0][:800]
        if driver:
            try:
                driver.save_screenshot(str(OUT / shot))
            except Exception:
                pass  # Si el navegador se cerro, se conserva el error original.
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    results.append({'caso':name,'estado':status,'detalle':detail,'captura':shot if (OUT/shot).exists() else None})
    print(name + ': ' + status)

def submit(driver):
    driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()

def correcto(driver, wait):
    driver.find_element(By.ID,'login-email').send_keys(EMAIL)
    driver.find_element(By.ID,'login-password').send_keys(PASSWORD)
    submit(driver)
    # Exigimos navegar al área privada, tener sesión y mostrar la navegación real.
    wait.until(lambda d: '/login' not in d.current_url)
    wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR,'aside nav')))
    assert driver.execute_script("return !!localStorage.getItem('centro-medico.auth-token')"), 'No se genero sesion'

def incorrecto(driver, wait):
    driver.find_element(By.ID,'login-email').send_keys(EMAIL)
    driver.find_element(By.ID,'login-password').send_keys('Incorrecta-para-prueba')
    submit(driver)
    alert = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR,'[role="alert"]')))
    assert 'credenciales incorrectas' in alert.text.lower(), 'Mensaje inesperado: '+alert.text
    assert '/login' in driver.current_url, 'El usuario invalido accedio al sistema'
    assert not driver.execute_script("return localStorage.getItem('centro-medico.auth-token')"), 'Se creo una sesion invalida'

def vacios(driver, wait):
    # Observamos submit: la validación HTML debe bloquearlo antes de llamar a React/API.
    driver.execute_script("window.enviosPrueba=0; document.querySelector('form').addEventListener('submit',()=>window.enviosPrueba++);")
    submit(driver)
    assert driver.execute_script("return document.getElementById('login-email').validity.valueMissing"), 'Falta validar correo obligatorio'
    assert driver.execute_script("return document.getElementById('login-password').validity.valueMissing"), 'Falta validar contrasena obligatoria'
    assert driver.execute_script('return window.enviosPrueba') == 0, 'Formulario vacio enviado'
    assert '/login' in driver.current_url
    assert not driver.execute_script("return localStorage.getItem('centro-medico.auth-token')")

prepared = False
try:
    fixture('setup')
    prepared = True
    run_case('01-login-correcto','Credenciales validas: acceso al panel y sesion creada.',correcto)
    run_case('02-login-incorrecto','Contrasena incorrecta: mensaje de error, sin sesion.',incorrecto)
    run_case('03-campos-vacios','Campos obligatorios: formulario bloqueado antes de enviarse.',vacios)
finally:
    if prepared:
        fixture('cleanup')
    passed = sum(r['estado']=='PASADO' for r in results)
    report = {'fecha':datetime.now().isoformat(timespec='seconds'),'herramienta':'Selenium con Python y Microsoft Edge','pasados':passed,'fallidos':len(results)-passed,'casos':results}
    (OUT/'resultados.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    rows=''.join('<tr><td>'+html.escape(r['caso'])+'</td><td>'+r['estado']+'</td><td>'+html.escape(r['detalle'])+'</td></tr>' for r in results)
    captures=''.join('<h3>'+html.escape(r['caso'])+'</h3><img src="'+r['captura']+'" alt="Evidencia '+r['caso']+'">' for r in results if r['captura'])
    (OUT/'reporte.html').write_text('<!doctype html><meta charset="utf-8"><title>Pruebas CentroMedico</title><style>body{font:16px system-ui;max-width:1050px;margin:40px auto;padding:20px;color:#243447}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:12px;text-align:left}img{width:100%;border:1px solid #ccd}h1{color:#0d6efd}</style><h1>Reporte de pruebas: CentroMedico</h1><p>'+html.escape(report['fecha'])+'</p><p>Selenium con Python y Edge. Frontend, API y PostgreSQL reales. Usuario temporal eliminado al finalizar.</p><p>Pasados: '+str(passed)+' | Fallidos: '+str(len(results)-passed)+'</p><table><tr><th>Caso</th><th>Resultado</th><th>Verificación</th></tr>'+rows+'</table><h2>Alcance y errores</h2><p>Se automatizaron tres de los cinco casos definidos. Registro con datos válidos e inválidos queda pendiente; esta entrega cubre el mínimo de tres casos de login. '+('No se encontraron errores en los casos ejecutados.' if passed==3 else 'Revisar los casos fallidos de la tabla; una falla de entorno no demuestra un defecto del sistema.')+'</p><h2>Capturas de ejecución</h2>'+captures+'<p>Referencia: <a href="https://www.selenium.dev/documentation/webdriver/getting_started/first_script/">Documentación oficial de Selenium</a>.</p>',encoding='utf-8')
if len(results)!=3 or any(r['estado']!='PASADO' for r in results):
    sys.exit(1)
