export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  avatar: string;
  schedule: string;
  patients: number;
  rating: number;
  status: "available" | "busy" | "off";
  experience: number;
  education: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: "Masculino" | "Femenino";
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  insurance: string;
  insuranceNumber: string;
  lastVisit: string;
  status: "active" | "inactive";
  doctor: string;
  allergies: string[];
  conditions: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: "Consulta" | "Control" | "Urgencia" | "Examen";
  status: "scheduled" | "completed" | "cancelled" | "in-progress";
  notes: string;
  room: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  diagnosis: string;
  treatment: string;
  prescription: string[];
  notes: string;
  followUp: string;
  attachments: number;
}

export const doctors: Doctor[] = [
  {
    id: "d1",
    name: "Dra. María González",
    specialty: "Cardiología",
    email: "m.gonzalez@medcenter.cl",
    phone: "+56 9 8765 4321",
    avatar: "https://images.unsplash.com/photo-1673865641073-4479f93a7776?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    schedule: "Lun - Vie, 08:00 - 17:00",
    patients: 142,
    rating: 4.9,
    status: "available",
    experience: 12,
    education: "Universidad de Chile",
  },
  {
    id: "d2",
    name: "Dr. Carlos Ramírez",
    specialty: "Neurología",
    email: "c.ramirez@medcenter.cl",
    phone: "+56 9 7654 3210",
    avatar: "https://images.unsplash.com/photo-1575654402720-0af3480d1fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    schedule: "Mar - Sáb, 09:00 - 18:00",
    patients: 98,
    rating: 4.7,
    status: "busy",
    experience: 8,
    education: "Pontificia Universidad Católica",
  },
  {
    id: "d3",
    name: "Dra. Laura Soto",
    specialty: "Medicina General",
    email: "l.soto@medcenter.cl",
    phone: "+56 9 6543 2109",
    avatar: "https://images.unsplash.com/photo-1643297653753-2d3f459edc6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    schedule: "Lun - Vie, 07:00 - 16:00",
    patients: 210,
    rating: 4.8,
    status: "available",
    experience: 15,
    education: "Universidad de Concepción",
  },
  {
    id: "d4",
    name: "Dr. Andrés Morales",
    specialty: "Cirugía",
    email: "a.morales@medcenter.cl",
    phone: "+56 9 5432 1098",
    avatar: "https://images.unsplash.com/photo-1605214178469-178b98bb29fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    schedule: "Lun - Jue, 08:00 - 15:00",
    patients: 75,
    rating: 4.9,
    status: "available",
    experience: 20,
    education: "Universidad de Santiago",
  },
  {
    id: "d5",
    name: "Dra. Valentina Pérez",
    specialty: "Pediatría",
    email: "v.perez@medcenter.cl",
    phone: "+56 9 4321 0987",
    avatar: "https://images.unsplash.com/photo-1569420626546-55b02c8376b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    schedule: "Lun - Vie, 09:00 - 18:00",
    patients: 185,
    rating: 4.95,
    status: "off",
    experience: 9,
    education: "Universidad Austral de Chile",
  },
];

export const patients: Patient[] = [
  {
    id: "p1",
    name: "Roberto Fuentes",
    dob: "1978-03-14",
    age: 46,
    gender: "Masculino",
    phone: "+56 9 1111 2222",
    email: "r.fuentes@gmail.com",
    address: "Av. Providencia 1234, Santiago",
    bloodType: "O+",
    insurance: "Fonasa",
    insuranceNumber: "FN-001234",
    lastVisit: "2026-04-05",
    status: "active",
    doctor: "Dra. María González",
    allergies: ["Penicilina"],
    conditions: ["Hipertensión", "Diabetes Tipo 2"],
  },
  {
    id: "p2",
    name: "Camila Vásquez",
    dob: "1995-07-22",
    age: 30,
    gender: "Femenino",
    phone: "+56 9 2222 3333",
    email: "c.vasquez@gmail.com",
    address: "Calle Las Rosas 567, Ñuñoa",
    bloodType: "A+",
    insurance: "Isapre Cruz Blanca",
    insuranceNumber: "CB-567890",
    lastVisit: "2026-04-10",
    status: "active",
    doctor: "Dra. Laura Soto",
    allergies: [],
    conditions: ["Asma"],
  },
  {
    id: "p3",
    name: "Sebastián Torres",
    dob: "1962-11-08",
    age: 63,
    gender: "Masculino",
    phone: "+56 9 3333 4444",
    email: "s.torres@gmail.com",
    address: "Pasaje Los Pinos 890, Las Condes",
    bloodType: "B-",
    insurance: "Isapre Banmédica",
    insuranceNumber: "BM-345678",
    lastVisit: "2026-03-28",
    status: "active",
    doctor: "Dr. Carlos Ramírez",
    allergies: ["Aspirina", "Ibuprofeno"],
    conditions: ["Parkinson", "Hipercolesterolemia"],
  },
  {
    id: "p4",
    name: "Javiera Contreras",
    dob: "2018-05-16",
    age: 7,
    gender: "Femenino",
    phone: "+56 9 4444 5555",
    email: "contreras.familia@gmail.com",
    address: "Av. Las Flores 321, Maipú",
    bloodType: "AB+",
    insurance: "Fonasa",
    insuranceNumber: "FN-789012",
    lastVisit: "2026-04-08",
    status: "active",
    doctor: "Dra. Valentina Pérez",
    allergies: ["Mariscos"],
    conditions: [],
  },
  {
    id: "p5",
    name: "Miguel Herrera",
    dob: "1985-09-30",
    age: 40,
    gender: "Masculino",
    phone: "+56 9 5555 6666",
    email: "m.herrera@gmail.com",
    address: "Calle O'Higgins 456, Valparaíso",
    bloodType: "O-",
    insurance: "Isapre Colmena",
    insuranceNumber: "CM-234567",
    lastVisit: "2026-02-15",
    status: "inactive",
    doctor: "Dr. Andrés Morales",
    allergies: [],
    conditions: ["Hernia Lumbar"],
  },
  {
    id: "p6",
    name: "Francisca Muñoz",
    dob: "2001-12-01",
    age: 24,
    gender: "Femenino",
    phone: "+56 9 6666 7777",
    email: "f.munoz@gmail.com",
    address: "Paseo La Alameda 789, Santiago Centro",
    bloodType: "A-",
    insurance: "Fonasa",
    insuranceNumber: "FN-456789",
    lastVisit: "2026-04-11",
    status: "active",
    doctor: "Dra. Laura Soto",
    allergies: ["Látex"],
    conditions: ["Anemia"],
  },
  {
    id: "p7",
    name: "Jorge Espinoza",
    dob: "1954-02-28",
    age: 72,
    gender: "Masculino",
    phone: "+56 9 7777 8888",
    email: "j.espinoza@gmail.com",
    address: "Villa El Sol 1011, Puente Alto",
    bloodType: "B+",
    insurance: "Isapre Vida Tres",
    insuranceNumber: "VT-678901",
    lastVisit: "2026-04-01",
    status: "active",
    doctor: "Dra. María González",
    allergies: [],
    conditions: ["Insuficiencia Cardíaca", "Artritis"],
  },
  {
    id: "p8",
    name: "Andrea Castillo",
    dob: "1990-06-19",
    age: 35,
    gender: "Femenino",
    phone: "+56 9 8888 9999",
    email: "a.castillo@gmail.com",
    address: "Av. Kennedy 2345, Vitacura",
    bloodType: "O+",
    insurance: "Isapre Cruz Blanca",
    insuranceNumber: "CB-901234",
    lastVisit: "2026-04-09",
    status: "active",
    doctor: "Dr. Carlos Ramírez",
    allergies: ["Sulfonamidas"],
    conditions: ["Migraña Crónica"],
  },
];

export const appointments: Appointment[] = [
  {
    id: "a1",
    patientId: "p1",
    patientName: "Roberto Fuentes",
    doctorId: "d1",
    doctorName: "Dra. María González",
    specialty: "Cardiología",
    date: "2026-04-13",
    time: "09:00",
    type: "Control",
    status: "scheduled",
    notes: "Control mensual de presión arterial",
    room: "Sala 3",
  },
  {
    id: "a2",
    patientId: "p2",
    patientName: "Camila Vásquez",
    doctorId: "d3",
    doctorName: "Dra. Laura Soto",
    specialty: "Medicina General",
    date: "2026-04-13",
    time: "10:30",
    type: "Consulta",
    status: "in-progress",
    notes: "Primera consulta por síntomas respiratorios",
    room: "Sala 1",
  },
  {
    id: "a3",
    patientId: "p3",
    patientName: "Sebastián Torres",
    doctorId: "d2",
    doctorName: "Dr. Carlos Ramírez",
    specialty: "Neurología",
    date: "2026-04-13",
    time: "11:00",
    type: "Control",
    status: "scheduled",
    notes: "Seguimiento tratamiento Parkinson",
    room: "Sala 5",
  },
  {
    id: "a4",
    patientId: "p4",
    patientName: "Javiera Contreras",
    doctorId: "d5",
    doctorName: "Dra. Valentina Pérez",
    specialty: "Pediatría",
    date: "2026-04-13",
    time: "12:00",
    type: "Control",
    status: "scheduled",
    notes: "Vacuna anual y control de talla/peso",
    room: "Sala 7",
  },
  {
    id: "a5",
    patientId: "p8",
    patientName: "Andrea Castillo",
    doctorId: "d2",
    doctorName: "Dr. Carlos Ramírez",
    specialty: "Neurología",
    date: "2026-04-14",
    time: "09:30",
    type: "Consulta",
    status: "scheduled",
    notes: "Evaluación nuevos episodios de migraña",
    room: "Sala 5",
  },
  {
    id: "a6",
    patientId: "p7",
    patientName: "Jorge Espinoza",
    doctorId: "d1",
    doctorName: "Dra. María González",
    specialty: "Cardiología",
    date: "2026-04-14",
    time: "10:00",
    type: "Examen",
    status: "scheduled",
    notes: "Ecocardiograma de control",
    room: "Sala 3",
  },
  {
    id: "a7",
    patientId: "p6",
    patientName: "Francisca Muñoz",
    doctorId: "d3",
    doctorName: "Dra. Laura Soto",
    specialty: "Medicina General",
    date: "2026-04-12",
    time: "08:30",
    type: "Consulta",
    status: "completed",
    notes: "Resultado exámenes de sangre",
    room: "Sala 1",
  },
  {
    id: "a8",
    patientId: "p5",
    patientName: "Miguel Herrera",
    doctorId: "d4",
    doctorName: "Dr. Andrés Morales",
    specialty: "Cirugía",
    date: "2026-04-12",
    time: "14:00",
    type: "Control",
    status: "completed",
    notes: "Post operatorio hernia",
    room: "Sala 6",
  },
  {
    id: "a9",
    patientId: "p2",
    patientName: "Camila Vásquez",
    doctorId: "d3",
    doctorName: "Dra. Laura Soto",
    specialty: "Medicina General",
    date: "2026-04-11",
    time: "09:00",
    type: "Control",
    status: "completed",
    notes: "Control mensual asma",
    room: "Sala 1",
  },
  {
    id: "a10",
    patientId: "p1",
    patientName: "Roberto Fuentes",
    doctorId: "d1",
    doctorName: "Dra. María González",
    specialty: "Cardiología",
    date: "2026-04-10",
    time: "11:30",
    type: "Urgencia",
    status: "completed",
    notes: "Elevación de presión arterial",
    room: "Urgencias",
  },
  {
    id: "a11",
    patientId: "p3",
    patientName: "Sebastián Torres",
    doctorId: "d2",
    doctorName: "Dr. Carlos Ramírez",
    specialty: "Neurología",
    date: "2026-04-15",
    time: "10:00",
    type: "Examen",
    status: "scheduled",
    notes: "Resonancia magnética cerebral",
    room: "Imagenología",
  },
  {
    id: "a12",
    patientId: "p7",
    patientName: "Jorge Espinoza",
    doctorId: "d1",
    doctorName: "Dra. María González",
    specialty: "Cardiología",
    date: "2026-04-09",
    time: "09:00",
    type: "Control",
    status: "cancelled",
    notes: "Cancelado por paciente",
    room: "Sala 3",
  },
];

export const medicalRecords: MedicalRecord[] = [
  {
    id: "mr1",
    patientId: "p1",
    patientName: "Roberto Fuentes",
    doctorId: "d1",
    doctorName: "Dra. María González",
    date: "2026-04-10",
    diagnosis: "Crisis hipertensiva leve",
    treatment: "Ajuste de medicación antihipertensiva. Reposo relativo por 48 hrs.",
    prescription: ["Enalapril 10mg (2 veces/día)", "Losartán 50mg (1 vez/día)"],
    notes: "Paciente respondió bien al tratamiento. PA al alta: 140/90.",
    followUp: "2026-04-13",
    attachments: 2,
  },
  {
    id: "mr2",
    patientId: "p2",
    patientName: "Camila Vásquez",
    doctorId: "d3",
    doctorName: "Dra. Laura Soto",
    date: "2026-04-11",
    diagnosis: "Asma bronquial controlada",
    treatment: "Mantener tratamiento actual. Se indica espirometría de control.",
    prescription: ["Salbutamol Inhaler 100mcg (SOS)", "Budesonida 200mcg (2 veces/día)"],
    notes: "FEV1 al 78%. Buena adherencia al tratamiento.",
    followUp: "2026-05-11",
    attachments: 1,
  },
  {
    id: "mr3",
    patientId: "p6",
    patientName: "Francisca Muñoz",
    doctorId: "d3",
    doctorName: "Dra. Laura Soto",
    date: "2026-04-12",
    diagnosis: "Anemia ferropénica moderada",
    treatment: "Suplementación con hierro oral. Dieta rica en hierro.",
    prescription: ["Sulfato Ferroso 300mg (2 veces/día)", "Vitamina C 500mg (1 vez/día)"],
    notes: "Hemoglobina: 9.2 g/dL. Control en 4 semanas con nuevos exámenes.",
    followUp: "2026-05-12",
    attachments: 3,
  },
  {
    id: "mr4",
    patientId: "p5",
    patientName: "Miguel Herrera",
    doctorId: "d4",
    doctorName: "Dr. Andrés Morales",
    date: "2026-04-12",
    diagnosis: "Post operatorio hernia lumbar – evolución favorable",
    treatment: "Fisioterapia 3 veces por semana. Restricción de carga por 4 semanas.",
    prescription: ["Ibuprofeno 400mg (3 veces/día con alimentos)", "Miorrelajante Ciclobenzaprina 5mg (noche)"],
    notes: "Herida quirúrgica en buen estado. Sin signos de infección.",
    followUp: "2026-04-26",
    attachments: 4,
  },
];

export const chartData = {
  appointmentsPerWeek: [
    { day: "Lun", citas: 18, completadas: 15 },
    { day: "Mar", citas: 22, completadas: 20 },
    { day: "Mié", citas: 20, completadas: 18 },
    { day: "Jue", citas: 25, completadas: 22 },
    { day: "Vie", citas: 28, completadas: 25 },
    { day: "Sáb", citas: 12, completadas: 11 },
  ],
  appointmentsPerMonth: [
    { mes: "Nov", citas: 320 },
    { mes: "Dic", citas: 290 },
    { mes: "Ene", citas: 350 },
    { mes: "Feb", citas: 310 },
    { mes: "Mar", citas: 380 },
    { mes: "Abr", citas: 125 },
  ],
  specialtyDistribution: [
    { name: "Medicina General", value: 38, color: "#2563eb" },
    { name: "Cardiología", value: 22, color: "#16a34a" },
    { name: "Neurología", value: 15, color: "#9333ea" },
    { name: "Pediatría", value: 18, color: "#f59e0b" },
    { name: "Cirugía", value: 7, color: "#ef4444" },
  ],
};
