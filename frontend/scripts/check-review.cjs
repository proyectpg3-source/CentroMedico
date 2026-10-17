// Regressions for the user's review. All APIs and third-party requests isolated.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5178';
    const output = process.env.UI_OUTPUT || path.resolve('../output/review-regressions'); fs.mkdirSync(output,{recursive:true});
    await context.addInitScript(() => localStorage.setItem('centro-medico.auth-token','isolated-review-fixture'));
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    let release; const gate=new Promise(r=>release=r);
    let failSave=false, configPuts=0, passwordPuts=0, visits=0;
    let settings={centerName:'Centro de pruebas',rut:'TEST-001',address:'',phone:'',email:'',website:'',timezone:'America/Guatemala',language:'Español (Latinoamérica)'};
    const user={id_usuario:1,nombre:'Administrador sintético',email:'admin@example.invalid',rol:'admin',activo:true};
    const patient={id_paciente:51,nombre:'Paciente sintético',dni:'TEST-51',fecha_registro:'2026-10-11T10:00:00Z'};
    const doctor={id_medico:61,nombre:'Médico sintético',especialidad:'General'};
    let users=[user];
    const appointment={id_cita:41,id_paciente:51,id_medico:61,fecha_hora:'2026-10-11T16:00:00Z',motivo:'Consulta sintética',estado:'confirmada',prioridad_clinica:'baja',puntaje_prioridad:10,paciente_nombre:patient.nombre,medico_nombre:doctor.nombre,id_visita:null};
    await context.route('**/api/**', async route=>{
      const req=route.request(),endpoint=new URL(req.url()).pathname,method=req.method();
      if(endpoint==='/api/configuracion'){
        if(method==='PUT'){configPuts++;if(failSave)return route.fulfill({status:503,json:{message:'No se pudo guardar la configuración.'}});settings=req.postDataJSON();}
        return route.fulfill({json:settings});
      }
      if(endpoint==='/api/auth/password'){passwordPuts++;return route.fulfill({json:{message:'La contraseña se actualizó correctamente.'}});}
      if(endpoint==='/api/auth/usuarios'){
        if(method==='POST'){users.push({...req.postDataJSON(),id_usuario:2,activo:true});return route.fulfill({status:201,json:users.at(-1)});}
        return route.fulfill({json:users});
      }
      if(endpoint==='/api/backups/export')return route.fulfill({json:{schemaVersion:3,exportedAt:'2026-10-11T12:00:00Z',generatedBy:user,counts:{configuracionCentro:1},data:{configuracionCentro:[{id:1,datos:settings}]}}});
      if(endpoint==='/api/dashboard/resumen'){await gate;return route.fulfill({json:{total_pacientes:73,total_medicos:1,total_citas:123,citas_por_mes:[{mes:'2026-08',citas:12},{mes:'2026-09',citas:111}],citas_por_estado:[]}});}
      if(endpoint==='/api/visitas'&&method==='POST'){
        const body=req.postDataJSON();assert.equal(body.id_cita,41);assert.equal(body.id_paciente,51);assert.equal(body.id_medico,61);assert.ok(body.fecha_visita);visits++;
        return route.fulfill({status:201,json:{id_visita:71,...body}});
      }
      const data={'/api/auth/me':{usuario:user},'/api/pacientes':[patient],'/api/pacientes/opciones':{data:[{id_paciente:patient.id_paciente,nombre:patient.nombre}],meta:{total:1,page:1,limit:100,totalPages:1}},'/api/medicos':[doctor],'/api/citas':[appointment],'/api/health':{status:'ok',database:'connected'},'/api/analisis/indicadores':{citas_activas:1,citas_alta_prioridad:0,espera_promedio_minutos:0,diagnosticos_frecuentes:[],motivos_frecuentes:[]}};
      return route.fulfill({json:data[endpoint]??[]});
    });
    await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))return route.fallback();if(url.origin===base)return route.continue();return route.abort();});
    await page.goto(base);
    await page.locator('.clinic-kpi').first().waitFor();
    assert.equal(await page.locator('.clinic-kpi [data-slot="skeleton"]').count(),4);
    assert.ok(!(await page.locator('.clinic-kpi').allInnerTexts()).some(t=>/\b73\b/.test(t)));
    release();await page.locator('.clinic-kpi').first().getByText('73',{exact:true}).waitFor();
    await page.locator('.recharts-xAxis').getByText('2026-09',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Buscar módulo'}).click();await page.getByLabel('Buscar módulo',{exact:true}).fill('citas');await page.getByLabel('Buscar módulo',{exact:true}).press('Enter');await page.waitForURL('**/appointments');
    await page.getByRole('button',{name:'Nueva cita',exact:true}).click();await page.getByRole('heading',{name:'Nueva cita medica',exact:true}).waitFor();
    // Close using the modal's first icon button and open a clinical conversion.
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    await page.getByRole('button',{name:/visita/i}).first().click();
    await page.getByRole('heading',{name:'Abrir visita medica',exact:true}).waitFor();
    await page.getByLabel('Diagnostico',{exact:false}).fill('Diagnóstico sintético');
    await page.getByRole('button',{name:/Crear visita|Guardar visita|Abrir visita/i}).last().click();
    await page.getByText('La cita se convirtio en visita medica',{exact:false}).waitFor();assert.equal(visits,1);
    await page.goto(base+'/settings');
    await page.getByLabel('Nombre del Centro Médico',{exact:true}).fill('Centro guardado');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await page.getByRole('status').getByText('Configuración guardada en el servidor.',{exact:true}).waitFor();assert.equal(configPuts,1);
    await page.reload();await page.getByLabel('Nombre del Centro Médico',{exact:true}).waitFor();assert.equal(await page.getByLabel('Nombre del Centro Médico',{exact:true}).inputValue(),'Centro guardado');
    failSave=true;await page.getByLabel('Nombre del Centro Médico',{exact:true}).fill('No guardado');await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Configuración guardada en el servidor.',{exact:true}).count(),0);failSave=false;
    await page.getByRole('button',{name:'Seguridad',exact:true}).click();
    await page.getByLabel('Contraseña actual',{exact:true}).fill('Synthetic-current');await page.getByLabel('Nueva contraseña',{exact:true}).fill('Synthetic-new');await page.getByLabel('Confirmar nueva contraseña',{exact:true}).fill('mismatch');await page.getByRole('button',{name:'Actualizar contraseña',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(passwordPuts,0);
    await page.getByLabel('Confirmar nueva contraseña',{exact:true}).fill('Synthetic-new');await page.getByRole('button',{name:'Actualizar contraseña',exact:true}).click();await page.getByRole('status').waitFor();assert.equal(passwordPuts,1);
    await page.getByRole('button',{name:'Usuarios',exact:true}).click();await page.getByRole('button',{name:'Nuevo usuario',exact:true}).click();await page.getByLabel('Nombre completo').fill('Usuario sintético');await page.getByLabel('Correo electrónico').fill('new@example.invalid');await page.getByLabel('Contraseña temporal').fill('Synthetic-password');await page.getByRole('button',{name:'Crear usuario',exact:true}).click();await page.getByText('new@example.invalid',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Datos y Backup',exact:true}).click();
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar backup',exact:true}).click();const download=await downloaded;await download.saveAs(path.join(output,'backup-sintetico.json'));const backup=JSON.parse(fs.readFileSync(path.join(output,'backup-sintetico.json'),'utf8'));assert.equal(backup.data.configuracionCentro[0].datos.centerName,'Centro guardado');
    await page.getByRole('button',{name:'Notificaciones',exact:true}).click();await page.getByText('El envío de recordatorios por correo y SMS todavía no está integrado.',{exact:false}).waitFor();
    await page.screenshot({path:path.join(output,'configuracion-notificaciones.png')});
    assert.deepEqual(errors,[]);console.log('PASS: dashboard sin cifras provisionales; tendencia API; búsqueda; nueva cita; visita con paciente/médico; guardado confirmado y fallo; contraseña; usuarios; descarga de respaldo. APIs sintéticas.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
