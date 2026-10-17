const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>localStorage.setItem('centro-medico.auth-token','synthetic'));
  let items=[], fail=false, role='admin';
  await context.route('**/*', async route=>{
   const u=new URL(route.request().url());
   if (!u.pathname.startsWith('/api/')) return u.origin==='http://127.0.0.1:5178'?route.continue():route.abort();
   if(u.pathname==='/api/auth/me') return route.fulfill({json:{usuario:{id_usuario:1,nombre:'Personal SQA',rol:role,activo:true}}});
   if(u.pathname==='/api/pacientes/opciones') { assert.equal(u.searchParams.get('q'),'SQA'); return route.fulfill({json:{data:[{id_paciente:7,nombre:'Paciente SQA'}],meta:{total:1}}}); }
   if(u.pathname.startsWith('/api/atenciones-rapidas')) {
    if(fail) return route.fulfill({status:500,json:{message:'Fallo sintético de guardado'}});
    const method=route.request().method();
    if(method==='POST') {const data=route.request().postDataJSON();items=[{...data,id:1,codigo:'AR-1',estado:'pendiente',id_paciente:null,iniciado_nombre:'Personal SQA',created_at:new Date().toISOString()}];return route.fulfill({status:201,json:items[0]});}
    if(method==='PATCH') {Object.assign(items[0],route.request().postDataJSON());return route.fulfill({json:items[0]});}
    return route.fulfill({json:items});
   }
   return route.fulfill({json:[]});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5178/atencion-rapida');
  await page.getByLabel('Motivo de atención *').fill('Chequeo sintético');
  await page.getByRole('button',{name:'Abrir atención rápida'}).click();
  await page.getByText('AR-1 · Persona sin identificar').waitFor();
  await page.reload(); await page.getByText('AR-1 · Persona sin identificar').waitFor();
  await page.getByRole('button',{name:'Iniciar atención',exact:true}).click();
  await page.getByRole('button',{name:'Finalizar atención',exact:true}).click();
  await page.getByText('Finalizada',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Vincular paciente · AR-1'}).click();
  await page.getByLabel('Buscar paciente por nombre').fill('SQA');
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await page.getByRole('combobox').selectOption('7');
  await page.getByRole('button',{name:'Confirmar vínculo'}).click();
  await page.getByText('Ficha vinculada · #7').waitFor();
  const out=path.resolve('../output/atencion-rapida');fs.mkdirSync(out,{recursive:true});
  for(const width of [320,390,768,1440]) {await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  fail=true;await page.getByLabel('Motivo de atención *').fill('No debe perderse');await page.getByRole('button',{name:'Abrir atención rápida'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Motivo de atención *').inputValue(),'No debe perderse');
  fail=false;role='recepcionista';items[0].estado='pendiente';await page.reload();await page.getByText('Pendiente',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Iniciar atención',exact:true}).count(),0);
  role='fundacion';await page.reload();await page.waitForURL('**/forbidden');assert.deepEqual(errors,[]);
  console.log('APROBADO: crear sin paciente, recargar, iniciar/finalizar, buscar/vincular, error conserva formulario, permisos UI y 320–1440 px. APIs simuladas.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
