require("dotenv").config({ quiet: true });

const PLACEHOLDER_PATTERNS = [
  /cambiar_esto/i,
  /clave_super_secreta/i,
  /changeme/i,
  /^secret$/i,
  /^password$/i,
];

const WEAK_DB_PASSWORDS = new Set(["root", "postgres", "admin", "password", "1234", "12345678"]);

const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Valida la configuracion critica antes de aceptar trafico.
 * Se llama desde index.js y desde el arranque directo de app.js,
 * no al hacer require(), para no romper pruebas que inyectan su propia config.
 */
function assertSecureEnv() {
  const problems = [];

  const jwtSecret = process.env.JWT_SECRET || "";
  if (!jwtSecret) {
    problems.push("JWT_SECRET no esta definido.");
  } else {
    if (jwtSecret.length < 32) {
      problems.push("JWT_SECRET debe tener al menos 32 caracteres.");
    }
    if (PLACEHOLDER_PATTERNS.some((re) => re.test(jwtSecret))) {
      problems.push("JWT_SECRET sigue siendo el valor de ejemplo. Genera uno nuevo.");
    }
  }

  if (!process.env.DB_PASSWORD) {
    problems.push("DB_PASSWORD no esta definido.");
  } else if (isProduction() && WEAK_DB_PASSWORDS.has(process.env.DB_PASSWORD.toLowerCase())) {
    problems.push("DB_PASSWORD es demasiado debil para produccion.");
  }

  if (isProduction() && !String(process.env.CORS_ORIGIN || "").trim()) {
    problems.push("CORS_ORIGIN debe definirse en produccion.");
  }

  if (problems.length) {
    const lines = [
      "Configuracion insegura, el servidor no se iniciara:",
      ...problems.map((p) => `  - ${p}`),
      "",
      "Genera un JWT_SECRET con:  npm run secret:generate",
    ];
    throw new Error(lines.join("\n"));
  }
}

module.exports = { assertSecureEnv, isProduction };
