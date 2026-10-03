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
  incomeByMonth: [
    { mes: "Nov", ingresos: 185000, egresos: 92000 },
    { mes: "Dic", ingresos: 172000, egresos: 88000 },
    { mes: "Ene", ingresos: 198000, egresos: 95000 },
    { mes: "Feb", ingresos: 176000, egresos: 90000 },
    { mes: "Mar", ingresos: 215000, egresos: 101000 },
    { mes: "Abr", ingresos: 224000, egresos: 108000 },
  ],
};

// ─── Cuentas de paciente / Caja ──────────────────────────────────────────

export interface AccountItem {
  id: string;
  description: string;
  category: "consulta" | "laboratorio" | "farmacia" | "procedimiento" | "otro";
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PatientAccount {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  items: AccountItem[];
  totalAmount: number;
  paid: number;
  pending: number;
  status: "open" | "partial" | "paid" | "invoiced";
}

export const patientAccounts: PatientAccount[] = [
  {
    id: "acc1",
    patientId: "p2",
    patientName: "Camila Vásquez",
    date: "2026-04-13",
    items: [
      { id: "ai1", description: "Consulta Medicina General", category: "consulta", quantity: 1, unitPrice: 150, total: 150 },
      { id: "ai2", description: "Hemograma completo", category: "laboratorio", quantity: 1, unitPrice: 85, total: 85 },
    ],
    totalAmount: 235,
    paid: 0,
    pending: 235,
    status: "open",
  },
  {
    id: "acc2",
    patientId: "p7",
    patientName: "Jorge Espinoza",
    date: "2026-04-14",
    items: [
      { id: "ai3", description: "Ecocardiograma de control", category: "procedimiento", quantity: 1, unitPrice: 450, total: 450 },
    ],
    totalAmount: 450,
    paid: 450,
    pending: 0,
    status: "paid",
  },
  {
    id: "acc3",
    patientId: "p6",
    patientName: "Francisca Muñoz",
    date: "2026-04-12",
    items: [
      { id: "ai4", description: "Consulta Medicina General", category: "consulta", quantity: 1, unitPrice: 150, total: 150 },
      { id: "ai5", description: "Sulfato Ferroso 300mg (caja)", category: "farmacia", quantity: 1, unitPrice: 45, total: 45 },
    ],
    totalAmount: 195,
    paid: 100,
    pending: 95,
    status: "partial",
  },
  {
    id: "acc4",
    patientId: "p1",
    patientName: "Roberto Fuentes",
    date: "2026-04-10",
    items: [
      { id: "ai6", description: "Consulta Cardiología de control", category: "consulta", quantity: 1, unitPrice: 180, total: 180 },
      { id: "ai7", description: "Enalapril 10mg (caja)", category: "farmacia", quantity: 1, unitPrice: 60, total: 60 },
    ],
    totalAmount: 240,
    paid: 240,
    pending: 0,
    status: "invoiced",
  },
];

// ─── Facturación SAT (FEL) ────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  series: string;
  patientId: string;
  patientName: string;
  patientNit: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  iva: number;
  total: number;
  status: "draft" | "issued" | "cancelled" | "annulled";
  satAuthorization?: string;
  satUuid?: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia" | "cheque";
}

export const invoices: Invoice[] = [
  {
    id: "inv1",
    invoiceNumber: "000001",
    series: "A",
    patientId: "p1",
    patientName: "Roberto Fuentes",
    patientNit: "CF",
    date: "2026-04-10",
    items: [
      { description: "Consulta Cardiología de control", quantity: 1, unitPrice: 180, total: 180 },
      { description: "Enalapril 10mg (caja)", quantity: 1, unitPrice: 60, total: 60 },
    ],
    subtotal: 240,
    iva: 28.8,
    total: 268.8,
    status: "issued",
    satAuthorization: "3F8A2C1D-7B4E-4A9F-9C2D-1E5F6A7B8C9D",
    satUuid: "9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D",
    paymentMethod: "tarjeta",
  },
  {
    id: "inv2",
    invoiceNumber: "000002",
    series: "A",
    patientId: "p7",
    patientName: "Jorge Espinoza",
    patientNit: "4455667-8",
    date: "2026-04-14",
    items: [{ description: "Ecocardiograma de control", quantity: 1, unitPrice: 450, total: 450 }],
    subtotal: 450,
    iva: 54,
    total: 504,
    status: "issued",
    satAuthorization: "1B2C3D4E-5F6A-7B8C-9D0E-1F2A3B4C5D6E",
    satUuid: "5D4C3B2A1F0E9D8C7B6A5F4E3D2C1B0A",
    paymentMethod: "transferencia",
  },
  {
    id: "inv3",
    invoiceNumber: "000003",
    series: "A",
    patientId: "p2",
    patientName: "Camila Vásquez",
    patientNit: "CF",
    date: "2026-04-13",
    items: [
      { description: "Consulta Medicina General", quantity: 1, unitPrice: 150, total: 150 },
      { description: "Hemograma completo", quantity: 1, unitPrice: 85, total: 85 },
    ],
    subtotal: 235,
    iva: 28.2,
    total: 263.2,
    status: "draft",
    paymentMethod: "efectivo",
  },
  {
    id: "inv4",
    invoiceNumber: "000004",
    series: "A",
    patientId: "p3",
    patientName: "Sebastián Torres",
    patientNit: "1122334-5",
    date: "2026-04-08",
    items: [{ description: "Resonancia magnética cerebral", quantity: 1, unitPrice: 620, total: 620 }],
    subtotal: 620,
    iva: 74.4,
    total: 694.4,
    status: "annulled",
    satAuthorization: "7A6B5C4D-3E2F-1A0B-9C8D-7E6F5A4B3C2D",
    satUuid: "2C1B0A9F8E7D6C5B4A3F2E1D0C9B8A7F",
    paymentMethod: "tarjeta",
  },
];

// ─── Farmacia ──────────────────────────────────────────────────────────────

export interface PharmacyItem {
  id: string;
  code: string;
  name: string;
  genericName: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  expiryDate: string;
  controlled: boolean;
}

export const pharmacyItems: PharmacyItem[] = [
  { id: "ph1", code: "MED-001", name: "Paracetamol 500mg", genericName: "Paracetamol", category: "Analgésico", stock: 340, minStock: 100, price: 3.5, expiryDate: "2027-06-01", controlled: false },
  { id: "ph2", code: "MED-002", name: "Ibuprofeno 400mg", genericName: "Ibuprofeno", category: "Antiinflamatorio", stock: 25, minStock: 50, price: 4.0, expiryDate: "2026-11-15", controlled: false },
  { id: "ph3", code: "MED-003", name: "Amoxicilina 500mg", genericName: "Amoxicilina", category: "Antibiótico", stock: 180, minStock: 60, price: 6.25, expiryDate: "2026-09-20", controlled: false },
  { id: "ph4", code: "MED-004", name: "Tramadol 50mg", genericName: "Tramadol", category: "Analgésico Opioide", stock: 40, minStock: 30, price: 12.0, expiryDate: "2027-01-10", controlled: true },
  { id: "ph5", code: "MED-005", name: "Diazepam 10mg", genericName: "Diazepam", category: "Ansiolítico", stock: 15, minStock: 20, price: 8.5, expiryDate: "2026-08-05", controlled: true },
  { id: "ph6", code: "MED-006", name: "Solución Salina 0.9% 1000mL", genericName: "Cloruro de sodio", category: "Soluciones IV", stock: 95, minStock: 40, price: 18.0, expiryDate: "2027-03-01", controlled: false },
  { id: "ph7", code: "MED-007", name: "Loratadina 10mg", genericName: "Loratadina", category: "Antihistamínico", stock: 210, minStock: 50, price: 2.75, expiryDate: "2027-05-12", controlled: false },
  { id: "ph8", code: "MED-008", name: "Insulina Glargina", genericName: "Insulina glargina", category: "Antidiabético", stock: 12, minStock: 15, price: 145.0, expiryDate: "2026-07-30", controlled: false },
];

// ─── Inventario de insumos médicos ─────────────────────────────────────────

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  cost: number;
  supplier: string;
  lastRestock: string;
  location: string;
}

export const inventoryItems: InventoryItem[] = [
  { id: "inv1", code: "INV-001", name: "Guantes de nitrilo (caja 100)", category: "Protección", stock: 45, minStock: 30, unit: "caja", cost: 55.0, supplier: "Distribuidora Médica GT", lastRestock: "2026-08-20", location: "Bodega A" },
  { id: "inv2", code: "INV-002", name: "Mascarillas quirúrgicas (caja 50)", category: "Protección", stock: 8, minStock: 20, unit: "caja", cost: 28.0, supplier: "Suministros Salud SA", lastRestock: "2026-07-15", location: "Bodega A" },
  { id: "inv3", code: "INV-003", name: "Jeringas 5mL", category: "Inyectable", stock: 320, minStock: 150, unit: "unidad", cost: 1.2, supplier: "MediSupply GT", lastRestock: "2026-08-25", location: "Bodega B" },
  { id: "inv4", code: "INV-004", name: "Agujas hipodérmicas 21G", category: "Inyectable", stock: 12, minStock: 100, unit: "unidad", cost: 0.45, supplier: "MediSupply GT", lastRestock: "2026-06-30", location: "Bodega B" },
  { id: "inv5", code: "INV-005", name: "Gasas estériles 10x10", category: "Curación", stock: 60, minStock: 40, unit: "paquete", cost: 12.5, supplier: "Distribuidora Médica GT", lastRestock: "2026-08-10", location: "Bodega A" },
  { id: "inv6", code: "INV-006", name: "Alcohol en gel 1L", category: "Antiséptico", stock: 25, minStock: 20, unit: "botella", cost: 22.0, supplier: "Suministros Salud SA", lastRestock: "2026-08-01", location: "Bodega C" },
  { id: "inv7", code: "INV-007", name: "Termómetros digitales", category: "Instrumental", stock: 18, minStock: 10, unit: "unidad", cost: 35.0, supplier: "Equipos Médicos GT", lastRestock: "2026-05-20", location: "Bodega C" },
  { id: "inv8", code: "INV-008", name: "Esparadrapo hipoalergénico", category: "Curación", stock: 5, minStock: 15, unit: "rollo", cost: 8.0, supplier: "Distribuidora Médica GT", lastRestock: "2026-07-05", location: "Bodega A" },
];

// ─── Documentos médicos ─────────────────────────────────────────────────

export interface MedicalDocument {
  id: string;
  patientId: string;
  patientName: string;
  uploadDate: string;
  documentType: string;
  fileName: string;
  fileType: "pdf" | "doc" | "docx" | "jpg" | "png" | "xlsx";
  fileSize: string;
  uploadedBy: string;
  examType: string;
  description: string;
  tags: string[];
}

export const medicalDocuments: MedicalDocument[] = [
  { id: "doc1", patientId: "p2", patientName: "Camila Vásquez", uploadDate: "2026-04-10", documentType: "Resultado de Laboratorio", fileName: "hemograma_camila_20260410.pdf", fileType: "pdf", fileSize: "1.2 MB", uploadedBy: "Laboratorio Central", examType: "Hemograma completo", description: "Resultado hemograma de control mensual.", tags: ["hemograma", "control"] },
  { id: "doc2", patientId: "p1", patientName: "Roberto Fuentes", uploadDate: "2026-04-10", documentType: "Electrocardiograma", fileName: "ecg_roberto_20260410.jpg", fileType: "jpg", fileSize: "3.4 MB", uploadedBy: "Dra. María González", examType: "Electrocardiograma (ECG)", description: "ECG de control post crisis hipertensiva.", tags: ["ecg", "cardiologia"] },
  { id: "doc3", patientId: "p3", patientName: "Sebastián Torres", uploadDate: "2026-04-15", documentType: "Imagen Diagnóstica", fileName: "rmn_sebastian_20260415.png", fileType: "png", fileSize: "8.1 MB", uploadedBy: "Imagenología", examType: "Resonancia magnética", description: "RMN cerebral de seguimiento por Parkinson.", tags: ["rmn", "neurologia"] },
  { id: "doc4", patientId: "p6", patientName: "Francisca Muñoz", uploadDate: "2026-04-12", documentType: "Historia Clínica", fileName: "historia_francisca_20260412.docx", fileType: "docx", fileSize: "0.5 MB", uploadedBy: "Dra. Laura Soto", examType: "Perfil lipídico", description: "Actualización de historia clínica.", tags: ["historia"] },
  { id: "doc5", patientId: "p7", patientName: "Jorge Espinoza", uploadDate: "2026-04-14", documentType: "Consentimiento Informado", fileName: "consentimiento_jorge_20260414.pdf", fileType: "pdf", fileSize: "0.3 MB", uploadedBy: "Recepción", examType: "Ecocardiograma", description: "Consentimiento para ecocardiograma de control.", tags: ["consentimiento"] },
  { id: "doc6", patientId: "p2", patientName: "Camila Vásquez", uploadDate: "2026-04-01", documentType: "Certificado Médico", fileName: "certificado_camila_20260401.xlsx", fileType: "xlsx", fileSize: "0.2 MB", uploadedBy: "Dra. Laura Soto", examType: "Uroanálisis", description: "Certificado médico para empleador.", tags: ["certificado"] },
];

// ─── Triaje de Emergencias ─────────────────────────────────────────────────

export interface TriagePatient {
  id: string;
  code: string;
  patientName: string;
  motive: string;
  priority: "ROJO" | "NARANJA" | "AMARILLO" | "VERDE";
  ingreso: string;
  waitMinutes: number;
  status: "waiting" | "in-attention" | "done";
}

export const triagePatients: TriagePatient[] = [
  { id: "t1", code: "EMG-0098", patientName: "María Xitumul Ren", motive: "Dolor torácico intenso, sudoración", priority: "ROJO", ingreso: "09:15", waitMinutes: 5, status: "in-attention" },
  { id: "t2", code: "EMG-0099", patientName: "Carlos Say Batz", motive: "Fractura expuesta de antebrazo tras caída", priority: "NARANJA", ingreso: "09:40", waitMinutes: 12, status: "waiting" },
  { id: "t3", code: "EMG-0100", patientName: "Elena Choc Ical", motive: "Cefalea leve, control de presión", priority: "VERDE", ingreso: "09:55", waitMinutes: 18, status: "waiting" },
];

// ─── Pagos e ingresos ───────────────────────────────────────────────────

export interface Payment {
  id: string;
  date: string;
  patientName: string;
  concept: string;
  method: "efectivo" | "tarjeta" | "transferencia" | "cheque" | "seguro";
  amount: number;
  status: "completed" | "pending" | "refunded";
  cashierId: string;
  reference?: string;
}

export const payments: Payment[] = [
  { id: "pay1", date: "2026-04-13", patientName: "Roberto Fuentes", concept: "Consulta Cardiología", method: "tarjeta", amount: 180, status: "completed", cashierId: "Ana López", reference: "AUTH-5521" },
  { id: "pay2", date: "2026-04-13", patientName: "Camila Vásquez", concept: "Consulta Medicina General + Laboratorio", method: "efectivo", amount: 235, status: "pending", cashierId: "Ana López" },
  { id: "pay3", date: "2026-04-14", patientName: "Jorge Espinoza", concept: "Ecocardiograma de control", method: "transferencia", amount: 450, status: "completed", cashierId: "Luis Ramos", reference: "TRX-88213" },
  { id: "pay4", date: "2026-04-12", patientName: "Francisca Muñoz", concept: "Consulta + Sulfato Ferroso", method: "efectivo", amount: 100, status: "completed", cashierId: "Ana López" },
  { id: "pay5", date: "2026-04-12", patientName: "Miguel Herrera", concept: "Fisioterapia post operatoria", method: "seguro", amount: 320, status: "completed", cashierId: "Luis Ramos", reference: "IGSS-33210" },
  { id: "pay6", date: "2026-04-08", patientName: "Sebastián Torres", concept: "Resonancia magnética cerebral", method: "tarjeta", amount: 620, status: "pending", cashierId: "Ana López" },
  { id: "pay7", date: "2026-04-09", patientName: "Andrea Castillo", concept: "Consulta Neurología", method: "cheque", amount: 160, status: "completed", cashierId: "Luis Ramos", reference: "CHQ-004521" },
  { id: "pay8", date: "2026-04-08", patientName: "Javiera Contreras", concept: "Control pediátrico + vacuna", method: "efectivo", amount: 90, status: "refunded", cashierId: "Ana López" },
];
