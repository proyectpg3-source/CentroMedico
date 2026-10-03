const urgentSymptoms = [
  "dificultad respiratoria",
  "dificultad para respirar",
  "disnea",
  "dolor de pecho",
  "dolor toracico",
  "convulsion",
  "perdida de conciencia",
  "sangrado abundante",
  "saturacion baja"
];

const warningSymptoms = [
  "fiebre alta",
  "dolor abdominal",
  "vomitos",
  "deshidratacion",
  "cefalea intensa",
  "mareo",
  "embarazo",
  "diabetes",
  "hipertension"
];

function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function addReason(reasons, reason) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function parseBloodPressure(value = "") {
  const match = value.toString().match(/^(\d{2,3})\/(\d{2,3})$/);
  if (!match) return null;
  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2])
  };
}

export function calculatePriority(input) {
  const text = normalizeText(
    [
      input.reason,
      input.triageNotes,
      input.chiefComplaint,
      input.currentIllness,
      input.medicalHistory
    ].filter(Boolean).join(" ")
  );

  const reasons = [];
  let score = 10;

  urgentSymptoms.forEach((symptom) => {
    if (text.includes(symptom)) {
      score += 30;
      addReason(reasons, `Presenta ${symptom}.`);
    }
  });

  warningSymptoms.forEach((symptom) => {
    if (text.includes(symptom)) {
      score += 15;
      addReason(reasons, `Se identifica ${symptom}.`);
    }
  });

  const temp = Number(input.vitalTemp ?? input.temperature ?? 0);
  const spo2 = Number(input.vitalSpo2 ?? input.spo2 ?? 0);
  const fc = Number(input.vitalFc ?? input.heartRate ?? 0);
  const fr = Number(input.vitalFr ?? input.respiratoryRate ?? 0);
  const bloodPressure = parseBloodPressure(input.vitalPa ?? input.bloodPressure ?? "");

  if (temp >= 39) {
    score += 25;
    addReason(reasons, "Temperatura igual o mayor a 39 grados.");
  } else if (temp >= 38) {
    score += 10;
    addReason(reasons, "Temperatura febril.");
  }

  if (spo2 > 0 && spo2 < 92) {
    score += 30;
    addReason(reasons, "Saturacion de oxigeno menor a 92%.");
  } else if (spo2 >= 92 && spo2 < 95) {
    score += 15;
    addReason(reasons, "Saturacion de oxigeno en rango de vigilancia.");
  }

  if (fc >= 120) {
    score += 15;
    addReason(reasons, "Frecuencia cardiaca elevada.");
  } else if (fc > 0 && fc <= 50) {
    score += 15;
    addReason(reasons, "Frecuencia cardiaca baja.");
  }

  if (fr >= 30) {
    score += 20;
    addReason(reasons, "Frecuencia respiratoria muy elevada.");
  } else if (fr >= 24) {
    score += 10;
    addReason(reasons, "Frecuencia respiratoria en rango de vigilancia.");
  } else if (fr > 0 && fr <= 8) {
    score += 20;
    addReason(reasons, "Frecuencia respiratoria baja.");
  }

  if (bloodPressure) {
    if (bloodPressure.systolic >= 180 || bloodPressure.diastolic >= 120) {
      score += 25;
      addReason(reasons, "Presion arterial en rango severamente elevado.");
    } else if (bloodPressure.systolic >= 160 || bloodPressure.diastolic >= 100) {
      score += 10;
      addReason(reasons, "Presion arterial elevada.");
    }

    if (bloodPressure.systolic <= 90) {
      score += 20;
      addReason(reasons, "Presion sistolica baja.");
    }
  }

  if (input.birthDate) {
    const age = new Date().getFullYear() - new Date(input.birthDate).getFullYear();
    if (age <= 5 || age >= 65) {
      score += 10;
      addReason(reasons, "Edad considerada de mayor vigilancia clinica.");
    }
  }

  const cappedScore = Math.min(score, 100);
  const level =
    cappedScore >= 70 ? "critica" :
    cappedScore >= 45 ? "alta" :
    cappedScore >= 25 ? "media" :
    "baja";

  return {
    score: cappedScore,
    level,
    reasons: reasons.length ? reasons : ["No se identificaron signos de alarma inmediatos."]
  };
}
