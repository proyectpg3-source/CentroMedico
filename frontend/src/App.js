import React, { startTransition, useDeferredValue, useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

const pageMeta = {
  dashboard: {
    title: 'Dashboard General',
    subtitle: 'Resumen del dia - Centro Medico La Aurora',
  },
  pacientes: {
    title: 'Gestion de Pacientes',
    subtitle: 'Registro, busqueda y seguimiento',
  },
  citas: {
    title: 'Citas y Agenda',
    subtitle: 'Control de agenda y seguimiento',
  },
  laboratorio: {
    title: 'Laboratorio',
    subtitle: 'Resultados y ordenes de examenes',
  },
  doctores: {
    title: 'Doctores y Staff',
    subtitle: 'Gestion de personal medico',
  },
  prediccion: {
    title: 'Prediccion y Optimizacion IA',
    subtitle: 'Analisis de datos historicos y demanda',
  },
  reportes: {
    title: 'Reportes y Analisis',
    subtitle: 'Indicadores de gestion y control',
  },
  config: {
    title: 'Configuracion',
    subtitle: 'Parametros del sistema clinico',
  },
};

const navigation = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'pacientes', label: 'Pacientes', icon: 'patients' },
      { id: 'citas', label: 'Citas', icon: 'calendar' },
    ],
  },
  {
    label: 'Operacion',
    items: [
      { id: 'laboratorio', label: 'Laboratorio', icon: 'lab' },
      { id: 'doctores', label: 'Doctores', icon: 'doctor' },
      { id: 'prediccion', label: 'Prediccion IA', icon: 'spark' },
      { id: 'reportes', label: 'Reportes', icon: 'report' },
      { id: 'config', label: 'Configuracion', icon: 'settings' },
    ],
  },
];

const emptyPaciente = {
  nombre: '',
  dni: '',
  telefono: '',
  email: '',
};

const emptyDoctor = {
  nombre: '',
  especialidad: '',
  licencia: '',
};

const emptyAppointment = {
  id_paciente: '',
  id_medico: '',
  fecha_hora: '',
  motivo: '',
  estado: 'pendiente',
};

const mockLabResults = [
  {
    codigo: 'LAB-1042',
    paciente: 'Maria Gomez',
    examen: 'Hemograma completo',
    estado: 'Normal',
    fecha: '2026-04-23',
  },
  {
    codigo: 'LAB-1043',
    paciente: 'Luis Perez',
    examen: 'Glucosa en ayunas',
    estado: 'Alerta',
    fecha: '2026-04-24',
  },
  {
    codigo: 'LAB-1044',
    paciente: 'Carla Soto',
    examen: 'Perfil lipidico',
    estado: 'Normal',
    fecha: '2026-04-24',
  },
  {
    codigo: 'LAB-1045',
    paciente: 'Jose Morales',
    examen: 'Dengue NS1',
    estado: 'Critico',
    fecha: '2026-04-25',
  },
];

const mockPredictions = [
  {
    area: 'Consulta general',
    actual: 42,
    predicted: 51,
    level: 'Alza',
  },
  {
    area: 'Laboratorio',
    actual: 19,
    predicted: 24,
    level: 'Alza',
  },
  {
    area: 'Emergencias',
    actual: 11,
    predicted: 9,
    level: 'Estable',
  },
  {
    area: 'Odontologia',
    actual: 14,
    predicted: 18,
    level: 'Crecimiento',
  },
];

const mockReportSymptoms = [
  { label: 'Fiebre y virosis', value: 39, width: 78, tone: 'blue' },
  { label: 'Hipertension arterial', value: 28, width: 56, tone: 'orange' },
  { label: 'Dolor abdominal', value: 21, width: 42, tone: 'green' },
  { label: 'Control general', value: 18, width: 36, tone: 'violet' },
];

const mockEmergencies = [
  { codigo: 'EMG-0047', prioridad: 'Rojo', diagnostico: 'Politraumatismo', doctor: 'Dr. Lopez' },
  { codigo: 'EMG-0046', prioridad: 'Naranja', diagnostico: 'Dengue probable', doctor: 'Dr. Barillas' },
  { codigo: 'EMG-0045', prioridad: 'Naranja', diagnostico: 'Crisis hipertensiva', doctor: 'Dra. Morales' },
];

const iconPaths = {
  dashboard: [
    'M4 4h7v7H4z',
    'M13 4h7v5h-7z',
    'M13 11h7v9h-7z',
    'M4 13h7v7H4z',
  ],
  patients: [
    'M9 10.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z',
    'M3.75 19c1.02-2.97 3.8-4.92 6.91-4.92 3.11 0 5.89 1.95 6.91 4.92',
    'M17.2 10.1a2.55 2.55 0 1 0 0-5.1',
    'M16.45 14.2c1.92.23 3.64 1.37 4.46 3',
  ],
  calendar: [
    'M7 3v3',
    'M17 3v3',
    'M4 9h16',
    'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  ],
  lab: [
    'M10 3v5.2L5.7 16a2 2 0 0 0 1.73 3h9.14A2 2 0 0 0 18.3 16L14 8.2V3',
    'M8.35 12h7.3',
  ],
  doctor: [
    'M12 4.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5Z',
    'M6 18.75c1.07-2.58 3.3-4 6-4s4.93 1.42 6 4',
    'M19.5 7.25v5',
    'M17 9.75h5',
  ],
  spark: [
    'M12 3.5 13.8 8 18.5 9.8 13.8 11.6 12 16.5 10.2 11.6 5.5 9.8 10.2 8Z',
  ],
  report: [
    'M6 4h8l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
    'M14 4v4h4',
    'M8.5 12h7',
    'M8.5 15h5.5',
  ],
  settings: [
    'M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z',
    'M12 2.75v2.5',
    'M12 18.75v2.5',
    'M4.93 4.93l1.77 1.77',
    'M17.3 17.3l1.77 1.77',
    'M2.75 12h2.5',
    'M18.75 12h2.5',
    'M4.93 19.07l1.77-1.77',
    'M17.3 6.7l1.77-1.77',
  ],
  search: [
    'M10.5 5.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
    'M15.2 15.2 19 19',
  ],
  plus: [
    'M12 5v14',
    'M5 12h14',
  ],
  save: [
    'M5 4h12l2 2v14H5z',
    'M8 4v5h8V4',
    'M9 18h6',
  ],
  clock: [
    'M12 6.5v5l3 2',
    'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
  ],
};

function AppIcon({ name }) {
  const paths = iconPaths[name] || [];

  return (
    <svg
      className="svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((path, index) => (
        <path key={`${name}-${index}`} d={path} />
      ))}
    </svg>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getErrorMessage(error, fallbackMessage) {
  return error.response?.data?.message || fallbackMessage;
}

function getInitials(name) {
  return String(name || 'CM')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0])
    .join('')
    .toUpperCase();
}

function appointmentStateLabel(value) {
  const labels = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    en_curso: 'En curso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  };

  return labels[value] || value || 'Sin estado';
}

function badgeClass(value) {
  const normalizedValue = String(value || '').toLowerCase();

  if (['confirmada', 'completada', 'normal', 'estable', 'alza', 'crecimiento', 'perfil completo'].includes(normalizedValue)) {
    return 'badge-green';
  }

  if (['pendiente', 'naranja', 'alerta', 'perfil parcial'].includes(normalizedValue)) {
    return 'badge-orange';
  }

  if (['cancelada', 'critico', 'rojo'].includes(normalizedValue)) {
    return 'badge-red';
  }

  if (['en curso'].includes(normalizedValue)) {
    return 'badge-blue';
  }

  return 'badge-gray';
}

function patientProfileLabel(patient) {
  if (patient.email && patient.telefono) {
    return 'Perfil completo';
  }

  if (patient.email || patient.telefono) {
    return 'Perfil parcial';
  }

  return 'Basico';
}

function KpiCard({ tone, icon, value, label, delta }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className={`kpi-icon ${tone}`}>
        <AppIcon name={icon} />
      </div>
      <div className="kpi-num">{value}</div>
      <div className="kpi-label">{label}</div>
      {delta ? <div className={`kpi-delta ${delta.tone}`}>{delta.label}</div> : null}
    </article>
  );
}

function SectionTitle({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [summary, setSummary] = useState({
    total_pacientes: 0,
    total_medicos: 0,
    total_citas: 0,
    citas_por_estado: [],
  });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [isBooting, setIsBooting] = useState(true);
  const [flash, setFlash] = useState(null);
  const [clockLabel, setClockLabel] = useState('');

  const [patientForm, setPatientForm] = useState(emptyPaciente);
  const [patientEditingId, setPatientEditingId] = useState(null);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSaving, setPatientSaving] = useState(false);

  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [doctorEditingId, setDoctorEditingId] = useState(null);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorSaving, setDoctorSaving] = useState(false);

  const [appointmentForm, setAppointmentForm] = useState(emptyAppointment);
  const [appointmentEditingId, setAppointmentEditingId] = useState(null);
  const [appointmentSaving, setAppointmentSaving] = useState(false);

  const deferredPatientQuery = useDeferredValue(patientQuery);
  const deferredDoctorQuery = useDeferredValue(doctorQuery);

  useEffect(() => {
    refreshClock();
    refreshAllData();
    const timer = setInterval(refreshClock, 60000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshClock() {
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(now);
    setClockLabel(formatted);
  }

  async function refreshAllData() {
    setIsBooting(true);

    const results = await Promise.allSettled([
      api.get('/dashboard/resumen'),
      api.get('/pacientes'),
      api.get('/medicos'),
      api.get('/citas'),
    ]);

    const errors = [];

    if (results[0].status === 'fulfilled') {
      setSummary(results[0].value.data);
    } else {
      errors.push(getErrorMessage(results[0].reason, 'No se pudo cargar el resumen.'));
    }

    if (results[1].status === 'fulfilled') {
      setPatients(results[1].value.data);
    } else {
      errors.push(getErrorMessage(results[1].reason, 'No se pudo cargar pacientes.'));
    }

    if (results[2].status === 'fulfilled') {
      setDoctors(results[2].value.data);
    } else {
      errors.push(getErrorMessage(results[2].reason, 'No se pudo cargar doctores.'));
    }

    if (results[3].status === 'fulfilled') {
      setAppointments(results[3].value.data);
    } else {
      errors.push(getErrorMessage(results[3].reason, 'No se pudo cargar citas.'));
    }

    if (errors.length > 0) {
      setFlash({ type: 'error', message: errors[0] });
    }

    setIsBooting(false);
  }

  function clearFlash() {
    setFlash(null);
  }

  function openPage(pageId) {
    clearFlash();
    startTransition(() => {
      setActivePage(pageId);
    });
  }

  function resetPatientForm() {
    setPatientForm(emptyPaciente);
    setPatientEditingId(null);
  }

  function resetDoctorForm() {
    setDoctorForm(emptyDoctor);
    setDoctorEditingId(null);
  }

  function resetAppointmentForm() {
    setAppointmentForm(emptyAppointment);
    setAppointmentEditingId(null);
  }

  function handlePatientFormChange(event) {
    const { name, value } = event.target;
    setPatientForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleDoctorFormChange(event) {
    const { name, value } = event.target;
    setDoctorForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleAppointmentFormChange(event) {
    const { name, value } = event.target;
    setAppointmentForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePatientSubmit(event) {
    event.preventDefault();
    clearFlash();

    if (!patientForm.nombre.trim() || !patientForm.dni.trim()) {
      setFlash({ type: 'error', message: 'Nombre y DNI son obligatorios.' });
      return;
    }

    try {
      setPatientSaving(true);

      if (patientEditingId) {
        await api.put(`/pacientes/${patientEditingId}`, patientForm);
        setFlash({ type: 'success', message: 'Paciente actualizado correctamente.' });
      } else {
        await api.post('/pacientes', patientForm);
        setFlash({ type: 'success', message: 'Paciente registrado correctamente.' });
      }

      resetPatientForm();
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo guardar el paciente.') });
    } finally {
      setPatientSaving(false);
    }
  }

  function handlePatientEdit(patient) {
    clearFlash();
    setPatientEditingId(patient.id_paciente);
    setPatientForm({
      nombre: patient.nombre || '',
      dni: patient.dni || '',
      telefono: patient.telefono || '',
      email: patient.email || '',
    });

    openPage('pacientes');
  }

  async function handlePatientDelete(patientId) {
    const shouldDelete = window.confirm('Se eliminara este paciente. Deseas continuar?');

    if (!shouldDelete) {
      return;
    }

    clearFlash();

    try {
      await api.delete(`/pacientes/${patientId}`);

      if (patientEditingId === patientId) {
        resetPatientForm();
      }

      setFlash({ type: 'success', message: 'Paciente eliminado correctamente.' });
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo eliminar el paciente.') });
    }
  }

  async function handleDoctorSubmit(event) {
    event.preventDefault();
    clearFlash();

    if (!doctorForm.nombre.trim() || !doctorForm.especialidad.trim()) {
      setFlash({ type: 'error', message: 'Nombre y especialidad son obligatorios.' });
      return;
    }

    try {
      setDoctorSaving(true);

      if (doctorEditingId) {
        await api.put(`/medicos/${doctorEditingId}`, doctorForm);
        setFlash({ type: 'success', message: 'Doctor actualizado correctamente.' });
      } else {
        await api.post('/medicos', doctorForm);
        setFlash({ type: 'success', message: 'Doctor registrado correctamente.' });
      }

      resetDoctorForm();
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo guardar el doctor.') });
    } finally {
      setDoctorSaving(false);
    }
  }

  function handleDoctorEdit(doctor) {
    clearFlash();
    setDoctorEditingId(doctor.id_medico);
    setDoctorForm({
      nombre: doctor.nombre || '',
      especialidad: doctor.especialidad || '',
      licencia: doctor.licencia || '',
    });

    openPage('doctores');
  }

  async function handleDoctorDelete(doctorId) {
    const shouldDelete = window.confirm('Se eliminara este doctor. Deseas continuar?');

    if (!shouldDelete) {
      return;
    }

    clearFlash();

    try {
      await api.delete(`/medicos/${doctorId}`);

      if (doctorEditingId === doctorId) {
        resetDoctorForm();
      }

      setFlash({ type: 'success', message: 'Doctor eliminado correctamente.' });
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo eliminar el doctor.') });
    }
  }

  async function handleAppointmentSubmit(event) {
    event.preventDefault();
    clearFlash();

    if (!appointmentForm.id_paciente || !appointmentForm.id_medico || !appointmentForm.fecha_hora) {
      setFlash({ type: 'error', message: 'Paciente, doctor y fecha/hora son obligatorios.' });
      return;
    }

    try {
      setAppointmentSaving(true);

      if (appointmentEditingId) {
        await api.put(`/citas/${appointmentEditingId}`, appointmentForm);
        setFlash({ type: 'success', message: 'Cita actualizada correctamente.' });
      } else {
        await api.post('/citas', appointmentForm);
        setFlash({ type: 'success', message: 'Cita registrada correctamente.' });
      }

      resetAppointmentForm();
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo guardar la cita.') });
    } finally {
      setAppointmentSaving(false);
    }
  }

  function handleAppointmentEdit(appointment) {
    clearFlash();
    setAppointmentEditingId(appointment.id_cita);
    setAppointmentForm({
      id_paciente: String(appointment.id_paciente || ''),
      id_medico: String(appointment.id_medico || ''),
      fecha_hora: formatDateTimeLocal(appointment.fecha_hora),
      motivo: appointment.motivo || '',
      estado: appointment.estado || 'pendiente',
    });

    openPage('citas');
  }

  async function handleAppointmentDelete(appointmentId) {
    const shouldDelete = window.confirm('Se eliminara esta cita. Deseas continuar?');

    if (!shouldDelete) {
      return;
    }

    clearFlash();

    try {
      await api.delete(`/citas/${appointmentId}`);

      if (appointmentEditingId === appointmentId) {
        resetAppointmentForm();
      }

      setFlash({ type: 'success', message: 'Cita eliminada correctamente.' });
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo eliminar la cita.') });
    }
  }

  async function handleAppointmentStatus(appointmentId, nextState) {
    clearFlash();

    try {
      await api.patch(`/citas/${appointmentId}/estado`, { estado: nextState });
      setFlash({ type: 'success', message: 'Estado de cita actualizado.' });
      await refreshAllData();
    } catch (error) {
      setFlash({ type: 'error', message: getErrorMessage(error, 'No se pudo actualizar el estado de la cita.') });
    }
  }

  const patientRows = patients.filter((patient) => {
    const text = [patient.nombre, patient.dni, patient.telefono, patient.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return text.includes(deferredPatientQuery.trim().toLowerCase());
  });

  const doctorRows = doctors.filter((doctor) => {
    const text = [doctor.nombre, doctor.especialidad, doctor.licencia]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return text.includes(deferredDoctorQuery.trim().toLowerCase());
  });

  const appointmentStateTotals = ['pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada']
    .reduce((accumulator, state) => {
      accumulator[state] = summary.citas_por_estado?.find((item) => item.estado === state)?.total || 0;
      return accumulator;
    }, {});

  const recentAppointments = [...appointments]
    .sort((first, second) => new Date(second.fecha_hora) - new Date(first.fecha_hora))
    .slice(0, 6);

  const recentPatients = [...patients]
    .sort((first, second) => new Date(second.fecha_registro || 0) - new Date(first.fecha_registro || 0))
    .slice(0, 5);

  const topDoctors = [...doctors]
    .sort((first, second) => (second.total_citas || 0) - (first.total_citas || 0))
    .slice(0, 5);

  function renderDashboard() {
    return (
      <div className="page active">
        <SectionTitle
          title="Dashboard General"
          subtitle="Resumen en tiempo real del Centro Medico La Aurora"
          actions={
            <>
              <button className="btn" type="button" onClick={() => openPage('citas')}>
                <AppIcon name="calendar" />
                Ver agenda
              </button>
              <button className="btn btn-primary" type="button" onClick={() => openPage('pacientes')}>
                <AppIcon name="plus" />
                Nuevo paciente
              </button>
            </>
          }
        />

        <div className="grid grid-4">
          <KpiCard
            tone="blue"
            icon="patients"
            value={summary.total_pacientes || patients.length}
            label="Pacientes registrados"
            delta={{ tone: 'up', label: `${patientRows.length} visibles` }}
          />
          <KpiCard
            tone="green"
            icon="doctor"
            value={summary.total_medicos || doctors.length}
            label="Doctores activos"
            delta={{ tone: 'up', label: 'Staff disponible' }}
          />
          <KpiCard
            tone="orange"
            icon="calendar"
            value={summary.total_citas || appointments.length}
            label="Citas registradas"
            delta={{ tone: 'warn', label: `${appointmentStateTotals.pendiente || 0} pendientes` }}
          />
          <KpiCard
            tone="blue"
            icon="spark"
            value={mockPredictions.length}
            label="Escenarios IA"
            delta={{ tone: 'up', label: 'Modelo listo' }}
          />
        </div>

        <div className="grid grid-12 dashboard-sections">
          <div className="card col-7">
            <div className="card-title">
              <div>
                Distribucion de estados
                <div className="card-subtitle">Seguimiento de citas por estado actual</div>
              </div>
              <button className="btn btn-xs" type="button" onClick={() => openPage('citas')}>Abrir citas</button>
            </div>

            <div className="stack-list">
              {[
                ['Pendiente', appointmentStateTotals.pendiente || 0],
                ['Confirmada', appointmentStateTotals.confirmada || 0],
                ['En curso', appointmentStateTotals.en_curso || 0],
                ['Completada', appointmentStateTotals.completada || 0],
                ['Cancelada', appointmentStateTotals.cancelada || 0],
              ].map(([label, total]) => {
                const max = Math.max(summary.total_citas || appointments.length || 1, 1);
                const width = Math.max((Number(total) / max) * 100, total ? 8 : 0);

                return (
                  <div className="progress-row" key={label}>
                    <span>{label}</span>
                    <div className="progress-track">
                      <div className="progress-bar" style={{ width: `${width}%` }} />
                    </div>
                    <strong>{total}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card col-5">
            <div className="card-title">
              <div>
                Ultimos pacientes
                <div className="card-subtitle">Entradas recientes del sistema</div>
              </div>
            </div>

            <div className="stack-list">
              {recentPatients.length === 0 ? (
                <p className="empty-copy">No hay pacientes registrados todavia.</p>
              ) : (
                recentPatients.map((patient) => (
                  <div className="list-row" key={patient.id_paciente}>
                    <div className="avatar-sm">{getInitials(patient.nombre)}</div>
                    <div className="list-copy">
                      <strong>{patient.nombre}</strong>
                      <span>DNI {patient.dni}</span>
                    </div>
                    <span className={`badge ${badgeClass(patientProfileLabel(patient))}`}>{patientProfileLabel(patient)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card col-7">
            <div className="card-title">
              <div>
                Citas recientes
                <div className="card-subtitle">Actividad mas reciente en agenda</div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Doctor</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.length === 0 ? (
                    <tr>
                      <td colSpan="4">No hay citas registradas.</td>
                    </tr>
                  ) : (
                    recentAppointments.map((appointment) => (
                      <tr key={appointment.id_cita}>
                        <td className="td-strong">{appointment.paciente_nombre}</td>
                        <td>{appointment.medico_nombre}</td>
                        <td>{formatDateTime(appointment.fecha_hora)}</td>
                        <td>
                          <span className={`badge ${badgeClass(appointmentStateLabel(appointment.estado))}`}>
                            {appointmentStateLabel(appointment.estado)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card col-5">
            <div className="card-title">
              <div>
                Carga por doctor
                <div className="card-subtitle">Volumen de citas registradas por staff</div>
              </div>
            </div>

            <div className="stack-list">
              {topDoctors.length === 0 ? (
                <p className="empty-copy">No hay doctores cargados.</p>
              ) : (
                topDoctors.map((doctor) => (
                  <div className="list-row" key={doctor.id_medico}>
                    <div className="list-copy">
                      <strong>{doctor.nombre}</strong>
                      <span>{doctor.especialidad}</span>
                    </div>
                    <strong className="mono-pill">{doctor.total_citas || 0}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPatients() {
    return (
      <div className="page active">
        <SectionTitle
          title="Gestion de Pacientes"
          subtitle="Registro clinico, datos de contacto y actualizaciones"
          actions={
            <button className="btn btn-primary" type="button" onClick={resetPatientForm}>
              <AppIcon name="plus" />
              Nuevo paciente
            </button>
          }
        />

        <div className="grid grid-4">
          <KpiCard tone="blue" icon="patients" value={patients.length} label="Pacientes totales" />
          <KpiCard
            tone="green"
            icon="report"
            value={patients.filter((patient) => patient.email).length}
            label="Con correo"
          />
          <KpiCard
            tone="orange"
            icon="clock"
            value={patients.filter((patient) => patient.telefono).length}
            label="Con telefono"
          />
          <KpiCard
            tone="blue"
            icon="search"
            value={patientRows.length}
            label="Resultados filtrados"
          />
        </div>

        <div className="grid grid-12 page-content">
          <div className="card col-8">
            <div className="card-title">
              <div>
                Listado general de pacientes
                <div className="card-subtitle">Busqueda rapida por nombre, DNI o contacto</div>
              </div>
              <div className="search-wrap compact">
                <input
                  value={patientQuery}
                  onChange={(event) => setPatientQuery(event.target.value)}
                  placeholder="Buscar paciente..."
                  aria-label="Buscar paciente"
                />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>DNI</th>
                    <th>Contacto</th>
                    <th>Registro</th>
                    <th>Perfil</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {patientRows.length === 0 ? (
                    <tr>
                      <td colSpan="6">No hay pacientes para mostrar.</td>
                    </tr>
                  ) : (
                    patientRows.map((patient) => (
                      <tr key={patient.id_paciente}>
                        <td className="td-strong">
                          <div className="row-user">
                            <div className="avatar-xs">{getInitials(patient.nombre)}</div>
                            <div>
                              <div>{patient.nombre}</div>
                              <small>ID #{patient.id_paciente}</small>
                            </div>
                          </div>
                        </td>
                        <td className="mono">{patient.dni}</td>
                        <td>
                          <div className="cell-lines">
                            <span>{patient.telefono || 'Sin telefono'}</span>
                            <small>{patient.email || 'Sin correo'}</small>
                          </div>
                        </td>
                        <td>{formatDate(patient.fecha_registro)}</td>
                        <td>
                          <span className={`badge ${badgeClass(patientProfileLabel(patient))}`}>
                            {patientProfileLabel(patient)}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button className="btn btn-xs" type="button" onClick={() => handlePatientEdit(patient)}>Editar</button>
                            <button className="btn btn-danger btn-xs" type="button" onClick={() => handlePatientDelete(patient.id_paciente)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card col-4">
            <div className="card-title">
              <div>
                {patientEditingId ? 'Editar paciente' : 'Registrar paciente'}
                <div className="card-subtitle">
                  {patientEditingId ? 'Actualiza informacion del expediente' : 'Agrega un nuevo registro al sistema'}
                </div>
              </div>
            </div>

            <form className="form-grid" onSubmit={handlePatientSubmit}>
              <div className="field fg-12">
                <label>Nombre completo</label>
                <input name="nombre" value={patientForm.nombre} onChange={handlePatientFormChange} placeholder="Ej. Maria Gomez" />
              </div>
              <div className="field fg-6">
                <label>DNI</label>
                <input name="dni" value={patientForm.dni} onChange={handlePatientFormChange} placeholder="Ej. 12345678" />
              </div>
              <div className="field fg-6">
                <label>Telefono</label>
                <input name="telefono" value={patientForm.telefono} onChange={handlePatientFormChange} placeholder="Ej. 5555-0000" />
              </div>
              <div className="field fg-12">
                <label>Correo electronico</label>
                <input name="email" type="email" value={patientForm.email} onChange={handlePatientFormChange} placeholder="Ej. paciente@correo.com" />
              </div>
              <div className="form-actions fg-12">
                <button className="btn" type="button" onClick={resetPatientForm}>Limpiar</button>
                <button className="btn btn-primary" type="submit" disabled={patientSaving}>
                  {patientSaving ? 'Guardando...' : patientEditingId ? 'Guardar cambios' : 'Guardar paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function renderAppointments() {
    return (
      <div className="page active">
        <SectionTitle
          title="Citas y Agenda"
          subtitle="Programacion, seguimiento y cambios de estado"
          actions={
            <button className="btn btn-primary" type="button" onClick={resetAppointmentForm}>
              <AppIcon name="plus" />
              Nueva cita
            </button>
          }
        />

        <div className="grid grid-4">
          <KpiCard tone="blue" icon="calendar" value={appointments.length} label="Total de citas" />
          <KpiCard tone="green" icon="report" value={appointmentStateTotals.confirmada || 0} label="Confirmadas" />
          <KpiCard tone="orange" icon="clock" value={appointmentStateTotals.pendiente || 0} label="Pendientes" />
          <KpiCard tone="blue" icon="spark" value={appointmentStateTotals.completada || 0} label="Completadas" />
        </div>

        <div className="grid grid-12 page-content">
          <div className="card col-8">
            <div className="card-title">
              <div>
                Agenda registrada
                <div className="card-subtitle">Vista actual de citas y estados</div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Doctor</th>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan="6">No hay citas registradas.</td>
                    </tr>
                  ) : (
                    appointments.map((appointment) => (
                      <tr key={appointment.id_cita}>
                        <td className="td-strong">{appointment.paciente_nombre}</td>
                        <td>
                          <div className="cell-lines">
                            <span>{appointment.medico_nombre}</span>
                            <small>{appointment.medico_especialidad || 'Sin especialidad'}</small>
                          </div>
                        </td>
                        <td>{formatDateTime(appointment.fecha_hora)}</td>
                        <td>{appointment.motivo || 'Sin motivo'}</td>
                        <td>
                          <span className={`badge ${badgeClass(appointmentStateLabel(appointment.estado))}`}>
                            {appointmentStateLabel(appointment.estado)}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button className="btn btn-xs" type="button" onClick={() => handleAppointmentEdit(appointment)}>Editar</button>
                            <button className="btn btn-success btn-xs" type="button" onClick={() => handleAppointmentStatus(appointment.id_cita, 'confirmada')}>Confirmar</button>
                            <button className="btn btn-danger btn-xs" type="button" onClick={() => handleAppointmentDelete(appointment.id_cita)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card col-4">
            <div className="card-title">
              <div>
                {appointmentEditingId ? 'Editar cita' : 'Nueva cita'}
                <div className="card-subtitle">Programa consultas y seguimiento medico</div>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleAppointmentSubmit}>
              <div className="field fg-12">
                <label>Paciente</label>
                <select name="id_paciente" value={appointmentForm.id_paciente} onChange={handleAppointmentFormChange}>
                  <option value="">Selecciona paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id_paciente} value={patient.id_paciente}>{patient.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field fg-12">
                <label>Doctor</label>
                <select name="id_medico" value={appointmentForm.id_medico} onChange={handleAppointmentFormChange}>
                  <option value="">Selecciona doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id_medico} value={doctor.id_medico}>{doctor.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field fg-12">
                <label>Fecha y hora</label>
                <input name="fecha_hora" type="datetime-local" value={appointmentForm.fecha_hora} onChange={handleAppointmentFormChange} />
              </div>
              <div className="field fg-12">
                <label>Motivo</label>
                <input name="motivo" value={appointmentForm.motivo} onChange={handleAppointmentFormChange} placeholder="Ej. Consulta general" />
              </div>
              <div className="field fg-12">
                <label>Estado</label>
                <select name="estado" value={appointmentForm.estado} onChange={handleAppointmentFormChange}>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="en_curso">En curso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-actions fg-12">
                <button className="btn" type="button" onClick={resetAppointmentForm}>Limpiar</button>
                <button className="btn btn-primary" type="submit" disabled={appointmentSaving}>
                  {appointmentSaving ? 'Guardando...' : appointmentEditingId ? 'Guardar cita' : 'Crear cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function renderDoctors() {
    return (
      <div className="page active">
        <SectionTitle
          title="Doctores y Staff"
          subtitle="Personal medico, especialidades y volumen de atencion"
          actions={
            <button className="btn btn-primary" type="button" onClick={resetDoctorForm}>
              <AppIcon name="plus" />
              Nuevo doctor
            </button>
          }
        />

        <div className="grid grid-4">
          <KpiCard tone="blue" icon="doctor" value={doctors.length} label="Doctores registrados" />
          <KpiCard tone="green" icon="report" value={new Set(doctors.map((doctor) => doctor.especialidad).filter(Boolean)).size} label="Especialidades" />
          <KpiCard tone="orange" icon="calendar" value={doctors.reduce((total, doctor) => total + Number(doctor.total_citas || 0), 0)} label="Citas asignadas" />
          <KpiCard tone="blue" icon="search" value={doctorRows.length} label="Resultados filtrados" />
        </div>

        <div className="grid grid-12 page-content">
          <div className="card col-8">
            <div className="card-title">
              <div>
                Directorio medico
                <div className="card-subtitle">Busqueda por nombre, especialidad o licencia</div>
              </div>
              <div className="search-wrap compact">
                <input
                  value={doctorQuery}
                  onChange={(event) => setDoctorQuery(event.target.value)}
                  placeholder="Buscar doctor..."
                  aria-label="Buscar doctor"
                />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Especialidad</th>
                    <th>Licencia</th>
                    <th>Total citas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {doctorRows.length === 0 ? (
                    <tr>
                      <td colSpan="5">No hay doctores para mostrar.</td>
                    </tr>
                  ) : (
                    doctorRows.map((doctor) => (
                      <tr key={doctor.id_medico}>
                        <td className="td-strong">
                          <div className="row-user">
                            <div className="avatar-xs">{getInitials(doctor.nombre)}</div>
                            <div>
                              <div>{doctor.nombre}</div>
                              <small>ID #{doctor.id_medico}</small>
                            </div>
                          </div>
                        </td>
                        <td>{doctor.especialidad}</td>
                        <td className="mono">{doctor.licencia || 'Sin licencia'}</td>
                        <td>{doctor.total_citas || 0}</td>
                        <td>
                          <div className="action-row">
                            <button className="btn btn-xs" type="button" onClick={() => handleDoctorEdit(doctor)}>Editar</button>
                            <button className="btn btn-danger btn-xs" type="button" onClick={() => handleDoctorDelete(doctor.id_medico)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card col-4">
            <div className="card-title">
              <div>
                {doctorEditingId ? 'Editar doctor' : 'Registrar doctor'}
                <div className="card-subtitle">Administra datos del staff medico</div>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleDoctorSubmit}>
              <div className="field fg-12">
                <label>Nombre completo</label>
                <input name="nombre" value={doctorForm.nombre} onChange={handleDoctorFormChange} placeholder="Ej. Dra. Ana Morales" />
              </div>
              <div className="field fg-12">
                <label>Especialidad</label>
                <input name="especialidad" value={doctorForm.especialidad} onChange={handleDoctorFormChange} placeholder="Ej. Medicina General" />
              </div>
              <div className="field fg-12">
                <label>Licencia</label>
                <input name="licencia" value={doctorForm.licencia} onChange={handleDoctorFormChange} placeholder="Ej. MED-00125" />
              </div>
              <div className="form-actions fg-12">
                <button className="btn" type="button" onClick={resetDoctorForm}>Limpiar</button>
                <button className="btn btn-primary" type="submit" disabled={doctorSaving}>
                  {doctorSaving ? 'Guardando...' : doctorEditingId ? 'Guardar doctor' : 'Registrar doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function renderLaboratory() {
    return (
      <div className="page active">
        <SectionTitle
          title="Laboratorio"
          subtitle="Resultados recientes y seguimiento de examenes"
          actions={
            <button className="btn btn-primary" type="button">
              <AppIcon name="plus" />
              Nuevo resultado
            </button>
          }
        />

        <div className="grid grid-4">
          <KpiCard tone="blue" icon="lab" value={mockLabResults.length} label="Resultados recientes" />
          <KpiCard tone="green" icon="report" value="84%" label="Resultados normales" />
          <KpiCard tone="orange" icon="clock" value="12h" label="Tiempo promedio" />
          <KpiCard tone="blue" icon="spark" value="3" label="Casos en revision" />
        </div>

        <div className="card">
          <div className="card-title">
            <div>
              Tabla de resultados
              <div className="card-subtitle">Vista de laboratorio inspirada en el modelo Clinica Aurora</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Paciente</th>
                  <th>Examen</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {mockLabResults.map((result) => (
                  <tr key={result.codigo}>
                    <td className="mono">{result.codigo}</td>
                    <td className="td-strong">{result.paciente}</td>
                    <td>{result.examen}</td>
                    <td><span className={`badge ${badgeClass(result.estado)}`}>{result.estado}</span></td>
                    <td>{formatDate(result.fecha)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderPrediction() {
    return (
      <div className="page active">
        <SectionTitle
          title="Prediccion y Optimizacion IA"
          subtitle="Analisis de demanda, ocupacion y comportamiento operativo"
        />

        <div className="grid grid-4">
          <KpiCard tone="blue" icon="spark" value="92%" label="Precision estimada" />
          <KpiCard tone="green" icon="calendar" value="51" label="Demanda prevista" />
          <KpiCard tone="orange" icon="clock" value="18m" label="Espera proyectada" />
          <KpiCard tone="blue" icon="report" value="4" label="Areas monitoreadas" />
        </div>

        <div className="card">
          <div className="card-title">
            <div>
              Predicciones del proximo bloque
              <div className="card-subtitle">Estimaciones de uso por area de atencion</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Volumen actual</th>
                  <th>Volumen proyectado</th>
                  <th>Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {mockPredictions.map((prediction) => (
                  <tr key={prediction.area}>
                    <td className="td-strong">{prediction.area}</td>
                    <td>{prediction.actual}</td>
                    <td>{prediction.predicted}</td>
                    <td><span className={`badge ${badgeClass(prediction.level)}`}>{prediction.level}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <div className="page active">
        <SectionTitle
          title="Reportes y Analisis"
          subtitle="Sintomas frecuentes, tiempos de atencion y emergencias"
        />

        <div className="grid grid-12 page-content">
          <div className="card col-6">
            <div className="card-title">
              <div>
                Sintomas mas frecuentes
                <div className="card-subtitle">Distribucion estimada por motivo de consulta</div>
              </div>
            </div>
            <div className="stack-list">
              {mockReportSymptoms.map((item) => (
                <div className="progress-row" key={item.label}>
                  <span>{item.label}</span>
                  <div className="progress-track">
                    <div className={`progress-bar progress-bar-${item.tone}`} style={{ width: `${item.width}%` }} />
                  </div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card col-6">
            <div className="card-title">
              <div>
                Tiempo promedio por semana
                <div className="card-subtitle">Comparativo operativo del ultimo bloque</div>
              </div>
            </div>
            <div className="bar-panel">
              {[18, 21, 16, 23, 19].map((value, index) => (
                <div className="bar-item" key={`bar-${index}`}>
                  <div className="bar-column" style={{ height: `${value * 3}px` }} />
                  <span>Sem {index + 1}</span>
                  <strong>{value}m</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card col-12">
            <div className="card-title">
              <div>
                Emergencias recientes
                <div className="card-subtitle">Panel de priorizacion visual tipo Clinica Aurora</div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Prioridad</th>
                    <th>Diagnostico</th>
                    <th>Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {mockEmergencies.map((emergency) => (
                    <tr key={emergency.codigo}>
                      <td className="mono">{emergency.codigo}</td>
                      <td><span className={`badge ${badgeClass(emergency.prioridad)}`}>{emergency.prioridad}</span></td>
                      <td>{emergency.diagnostico}</td>
                      <td>{emergency.doctor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderConfig() {
    return (
      <div className="page active">
        <SectionTitle
          title="Configuracion del Sistema"
          subtitle="Parametros base del centro medico"
        />

        <div className="card form-panel">
          <div className="card-title">
            <div>
              Informacion de la clinica
              <div className="card-subtitle">Plantilla inicial basada en Clinica Aurora</div>
            </div>
          </div>

          <div className="form-grid">
            <div className="field fg-6">
              <label>Nombre de la clinica</label>
              <input defaultValue="Centro Medico La Aurora" />
            </div>
            <div className="field fg-6">
              <label>Director medico</label>
              <input defaultValue="Dr. Demsyll Barillas" />
            </div>
            <div className="field fg-6">
              <label>Direccion</label>
              <input defaultValue="San Antonio Suchitepequez, Guatemala" />
            </div>
            <div className="field fg-3">
              <label>Telefono</label>
              <input defaultValue="5555-0000" />
            </div>
            <div className="field fg-3">
              <label>Horario</label>
              <input defaultValue="24/7" />
            </div>
            <div className="field fg-12">
              <label>Reglas de triage</label>
              <textarea
                rows="6"
                defaultValue={
                  'Rojo: atencion inmediata para trauma mayor, sangrado intenso o dolor toracico severo.\nNaranja: evaluacion urgente menor a 30 minutos.\nAmarillo: observacion y seguimiento clinico.'
                }
              />
            </div>
            <div className="field fg-12 form-actions">
              <button className="btn" type="button">Cancelar</button>
              <button className="btn btn-primary" type="button">
                <AppIcon name="save" />
                Guardar configuracion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderActivePage() {
    switch (activePage) {
      case 'pacientes':
        return renderPatients();
      case 'citas':
        return renderAppointments();
      case 'laboratorio':
        return renderLaboratory();
      case 'doctores':
        return renderDoctors();
      case 'prediccion':
        return renderPrediction();
      case 'reportes':
        return renderReports();
      case 'config':
        return renderConfig();
      default:
        return renderDashboard();
    }
  }

  const currentMeta = pageMeta[activePage] || pageMeta.dashboard;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon">CM</div>
            <div className="brand-info">
              <strong>Centro Medico</strong>
              <span>Sistema clinico integrado</span>
            </div>
          </div>
        </div>

        {navigation.map((section) => (
          <div className="sidebar-section" key={section.label}>
            <div className="sidebar-label">{section.label}</div>
            {section.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                type="button"
                onClick={() => openPage(item.id)}
              >
                <div className="nav-left">
                  <span className="nav-icon">
                    <AppIcon name={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.id === 'citas' ? <span className="nav-badge warn">{appointments.length}</span> : null}
                {item.id === 'prediccion' ? <span className="nav-badge success">IA</span> : null}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="status-row">
            <span className="dot green" />
            <span>{isBooting ? 'Sincronizando datos...' : 'API lista para operar'}</span>
          </div>
          <div className="status-row">
            <span className="dot yellow" />
            <span>{summary.total_citas || appointments.length} citas registradas</span>
          </div>
          <div className="status-row">
            <span className="dot green" />
            <span>{summary.total_medicos || doctors.length} doctores cargados</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{currentMeta.title}</h1>
            <p>{currentMeta.subtitle}</p>
          </div>

          <div className="topbar-actions">
            <div className="search-wrap">
              <input placeholder="Buscar modulo o registro..." aria-label="Buscar modulo o registro" />
            </div>
            <div className="topbar-date">{clockLabel}</div>
            <button className="user-pill" type="button">
              <div className="user-avatar">ER</div>
              <div className="user-info">
                <strong>Equipo de Recepcion</strong>
                <span>Administrador</span>
              </div>
            </button>
          </div>
        </header>

        <div className="content-area">
          {flash ? (
            <div className={`flash flash-${flash.type}`}>
              <span>{flash.message}</span>
              <button type="button" onClick={clearFlash}>Cerrar</button>
            </div>
          ) : null}

          {renderActivePage()}
        </div>
      </div>
    </div>
  );
}

export default App;
