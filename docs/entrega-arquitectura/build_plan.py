from pathlib import Path
from datetime import datetime,timedelta
import json
BASE=Path(__file__).resolve().parent
OUT=BASE.parents[1]/'output'/'documents'
OUT.mkdir(parents=True,exist_ok=True)
tasks=[]
def add(i,name,start,end,h,dep,deliver):
 tasks.append(dict(id=i,name=name,start=start,end=end,h=h,dep=dep,deliver=deliver,status='Pendiente',actual=0))
add('A1','Inventario de avances y alcance','2026-09-22','2026-09-22',2,'','Matriz de avances y alcance')
add('A2','Cronograma y recursos','2026-09-23','2026-09-23',2,'A1','Plan con dependencias y horas')
add('A3','Arquitectura y clases','2026-09-24','2026-09-24',2,'A2','Diagramas y contratos')
add('A4','UX y evidencias del prototipo','2026-09-25','2026-09-25',2,'A3','Capturas y guion de demostración')
add('A5','Revisión técnica y formato','2026-09-26','2026-09-26',2,'A4','Word revisado y lista de cotejo')
add('A6','Ensayo y entrega académica','2026-09-27','2026-09-27',2,'A5','Documento y prototipo presentados')
names=[('B1','Unificar permisos y contratos',6,'Matriz frontend y backend consistente'),('B2','Pacientes médicos y citas',6,'Altas y edición comprobadas por rol'),('B3','Recepción triaje y consulta',8,'Flujo clínico integral comprobado'),('B4','Pruebas del flujo clínico',4,'Casos negativos y correcciones'),('B5','Laboratorio farmacia y cargos',8,'Dispensación vinculada a paciente y cargo'),('B6','Documentos e inventario',4,'Edición y consulta de historial verificadas'),('B7','Pagos y reportes',8,'Saldos y reportes conciliados'),('B8','Configuración y usuarios',4,'Preferencias y usuarios persistentes'),('B9','Despliegue de demostración',8,'Sitio HTTPS accesible desde otra red'),('B10','Respaldo y controles de acceso',4,'Restauración y permisos comprobados'),('B11','Pruebas de aceptación',8,'Flujos aprobados y defectos corregidos'),('B12','Documentación y reserva final',4,'Manual final y margen de correcciones')]
slots=[]
for w in range(6):
 for day in [0,2,4]:
  d=datetime(2026,9,28)+timedelta(days=w*7+day)
  for hour in range(18,22):slots.append(d.replace(hour=hour))
pos=0
for idx,(i,name,h,deliver) in enumerate(names):
 start=slots[pos];end=slots[pos+h-1]+timedelta(hours=1);pos+=h
 add(i,name,start.date().isoformat(),end.date().isoformat(),h,'A6' if idx==0 else names[idx-1][0],deliver)
(BASE/'tasks.json').write_text(json.dumps(tasks,ensure_ascii=False,indent=2),encoding='utf8')
html='''<!doctype html><html lang="es"><meta charset="utf-8"><title>Planificador CentroMedico</title><style>
body{font:15px Arial,sans-serif;background:#f5f7fa;color:#172b40;margin:28px}h1{font-size:26px}p{line-height:1.5}button,select,input{padding:7px;border:1px solid #aab9c6;border-radius:5px}button{background:#173c57;color:white;cursor:pointer}.stats{display:flex;gap:20px;margin:18px 0}.stats div{background:white;border:1px solid #d3dee5;padding:18px;min-width:170px}strong{font-size:23px;display:block}table{border-collapse:collapse;background:white;width:100%;font-size:13px}th,td{padding:9px;border:1px solid #d3dee5;text-align:left}th{background:#173c57;color:white}input{width:60px}small{display:block}.gantt{display:grid;grid-template-columns:270px repeat(7,1fr);background:white;margin:20px 0;border:1px solid #d3dee5}.gantt div{padding:8px;border-bottom:1px solid #ddd;font-size:12px}.bar{background:#237c82;color:white;border-radius:3px;margin:4px;padding:4px!important}#notice{color:#8b3500}</style>
<h1>Planificador CentroMedico</h1><p>Daniel Eleazar Mendizabal Garcia · Análisis de Sistema 2<br>Entrega académica: 27/09/2026 · Finalización propuesta del sistema: 06/11/2026</p>
<p>Plan base propuesto: 12 horas para la entrega + 72 horas para completar el prototipo. Las horas reales se registran por tarea; el avance solo cambia al marcar una tarea como terminada.</p>
<button onclick="download()">Exportar seguimiento JSON</button> <button onclick="window.print()">Imprimir cronograma</button><p id="notice"></p><div class="stats" id="stats"></div><h2>Cronograma semanal</h2><div class="gantt" id="gantt"></div><h2>Tareas y seguimiento</h2><table><thead><tr><th>ID</th><th>Actividad y entregable</th><th>Inicio</th><th>Fin</th><th>Horas</th><th>Depende</th><th>Estado</th><th>Horas reales</th></tr></thead><tbody id="rows"></tbody></table>
<script>const baseline=TASKDATA;let tasks=baseline;try{const saved=JSON.parse(localStorage.getItem('centromedico-plan-20260922'));if(Array.isArray(saved)&&saved.length===baseline.length)tasks=saved}catch(e){};
function render(){document.getElementById('stats').innerHTML='<div>Esfuerzo planificado<strong>84 h</strong></div><div>Esfuerzo registrado<strong>'+tasks.reduce((a,t)=>a+Number(t.actual||0),0)+' h</strong></div><div>Avance del plan<strong>'+Math.round(tasks.filter(t=>t.status==='Terminada').reduce((a,t)=>a+t.h,0)/84*100)+'%</strong></div>';document.getElementById('rows').innerHTML=tasks.map((t,i)=>`<tr><td>${t.id}</td><td>${t.name}<small>${t.deliver}</small></td><td>${t.start}</td><td>${t.end}</td><td>${t.h}</td><td>${t.dep||'—'}</td><td><select onchange="update(${i},'status',this.value)">${['Pendiente','En curso','Bloqueada','Terminada'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><input aria-label="Horas reales ${t.id}" type="number" min="0" step="0.5" value="${t.actual}" onchange="update(${i},'actual',Number(this.value))"></td></tr>`).join('');let g='<div>Etapa</div>'+['22–27 sep','28 sep–4 oct','5–11 oct','12–18 oct','19–25 oct','26 oct–1 nov','2–8 nov'].map(s=>'<div>'+s+'</div>').join('');['Entrega académica','Permisos y registros','Flujo clínico','Laboratorio y farmacia','Pagos y configuración','Despliegue y respaldo','Aceptación y cierre'].forEach((s,i)=>{g+='<div>'+s+'</div>';for(let c=0;c<7;c++)g+=c===i?'<div class="bar">12 h</div>':'<div></div>'});document.getElementById('gantt').innerHTML=g}
function update(i,k,v){if(k==='actual'&&(!Number.isFinite(v)||v<0))return;tasks[i][k]=v;try{localStorage.setItem('centromedico-plan-20260922',JSON.stringify(tasks));document.getElementById('notice').textContent='Seguimiento guardado en este navegador. Exporta JSON para conservar una copia.'}catch(e){document.getElementById('notice').textContent='No se pudo guardar localmente. Exporta el seguimiento.'}render()}
function download(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(tasks,null,2)],{type:'application/json'}));a.download='seguimiento-centromedico.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}render();</script></html>'''.replace('TASKDATA',json.dumps(tasks,ensure_ascii=False))
(OUT/'planificador-centromedico.html').write_text(html,encoding='utf8')
print('Plan: 18 tareas,',sum(t['h'] for t in tasks),'horas')
