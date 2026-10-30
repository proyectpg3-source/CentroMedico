import React from "react";

interface PrescriptionPrintProps {
  patient: {
    nombre: string;
    dni: string;
    fecha_nacimiento: string;
  };
  doctor: {
    nombre: string;
    especialidad: string;
  };
  prescription: {
    medicamento: string;
    dosis: string;
    frecuencia: string;
    duracion: string;
    instrucciones: string;
  };
  date: string;
}

export default function PrescriptionPrint({ patient, doctor, prescription, date }: PrescriptionPrintProps) {
  return (
    <div className="bg-white p-8 text-slate-900 font-serif" id="printable-prescription">
      {/* Encabezado del Centro Médico */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold uppercase text-slate-800">Centro Médico Profesional</h1>
          <p className="text-sm text-slate-600">Atención Integral de la Salud</p>
          <p className="text-xs text-slate-500">Av. Principal, Ciudad Médica | Tel: (502) 5555-0123</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">Fecha: {date}</p>
          <p className="text-xs text-slate-500">Receta Médica</p>
        </div>
      </div>

      {/* Datos del Paciente */}
      <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Paciente</p>
          <p className="text-lg font-medium">{patient.nombre}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Documento / Identidad</p>
          <p className="text-sm">{patient.dni}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Fecha de Nacimiento</p>
          <p className="text-sm">{patient.fecha_nacimiento}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Médico Tratante</p>
          <p className="text-sm font-medium">{doctor.nombre} ({doctor.especialidad})</p>
        </div>
      </div>

      {/* Cuerpo de la Receta (Rp) */}
      <div className="mb-12 min-h-[300px]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl font-bold text-slate-800 italic">Rp.</span>
          <div className="h-px flex-1 bg-slate-300"></div>
        </div>

        <div className="space-y-6 pl-4">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xl font-bold text-slate-900">{prescription.medicamento}</p>
            <p className="text-md text-slate-700 mt-1">
              <span className="font-semibold">Dosis:</span> {prescription.dosis}
              <span className="mx-2">|</span>
              <span className="font-semibold">Frecuencia:</span> {prescription.frecuencia}
              <span className="mx-2">|</span>
              <span className="font-semibold">Duración:</span> {prescription.duracion}
            </p>
          </div>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase text-slate-500 mb-2">Instrucciones Adicionales:</p>
            <p className="text-sm text-slate-700 italic leading-relaxed">
              {prescription.instrucciones || "No hay instrucciones adicionales."}
            </p>
          </div>
        </div>
      </div>

      {/* Firma y Sello */}
      <div className="mt-20 flex justify-end">
        <div className="text-center w-64">
          <div className="border-t border-slate-800 pt-2">
            <p className="text-sm font-bold">{doctor.nombre}</p>
            <p className="text-xs text-slate-500">{doctor.especialidad}</p>
            <p className="text-[10px] text-slate-400 italic">Sello y Firma del Médico</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          #printable-prescription {
            border: none;
            box-shadow: none;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
