# Centro Medico La Aurora

Sistema web para gestionar pacientes, citas, triaje, historias clinicas,
laboratorio, prescripciones, pagos, reportes y priorizacion de atencion.

## Flujo clinico

1. Recepcion registra o localiza al paciente y crea la cita.
2. Enfermeria registra el triaje, antecedentes breves y signos vitales.
3. El sistema calcula una prioridad de apoyo que debe validar el personal clinico.
4. El medico registra la historia de la enfermedad, antecedentes, examen fisico,
   impresion, diagnostico, tratamiento, conducta y egreso o referencia.
5. Laboratorio, prescripciones y pagos quedan relacionados con la visita.

## Ejecutar

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Aplicacion: `http://localhost:5173`

## Verificacion

```bash
cd backend
npm test
npm run test:clinical
npm run db:check
```
