/*
 * Ejecuta un caso de validación con el mismo
 * flujo que usa el servicio de priorización:
 * registro SATS estructurado → motor de propuestas.
 */
const {
  DISCRIMINATORS,
} = require('./satsAcademicClassifier');
const {
  normalizeDiscriminatorReview,
  classifySatsStructured,
} = require('./satsStructuredReview');
const {
  proposePriority,
} = require('./priorityProposalEngine');
const { ALL_ABSENT } = require('./priorityValidationCases');

function runValidationCase(validationCase) {
  const input = validationCase.entrada;

  const rawReview = { ...input.revision };
  const fillAbsent = rawReview[ALL_ABSENT] === true;
  delete rawReview[ALL_ABSENT];

  const reviewInput = {};
  if (fillAbsent) {
    for (const code of Object.keys(DISCRIMINATORS)) reviewInput[code] = 'AUSENTE';
  }
  Object.assign(reviewInput, rawReview);

  const review = normalizeDiscriminatorReview(reviewInput);

  const satsAssessment = {
    movilidad: input.movilidad,
    estado_conciencia: input.estado_conciencia,
    trauma: input.trauma,
    revision_discriminadores: review,
    datos_no_obtenibles: input.no_obtenibles,
  };

  const structured = classifySatsStructured({
    currentCase: {
      edad: input.edad,
      movilidad: input.movilidad,
      estado_conciencia: input.estado_conciencia,
      trauma: input.trauma,
      signos_vitales: input.vitals,
    },
    review,
    unavailableData: input.no_obtenibles,
  });

  return proposePriority({
    structured,
    satsAssessment,
    vitals: input.vitals,
  });
}

module.exports = { runValidationCase };
