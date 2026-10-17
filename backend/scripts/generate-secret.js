// Genera un secreto criptografico de 64 bytes para la configuracion local.

const crypto = require("node:crypto");
const secret = crypto.randomBytes(64).toString("hex");
console.log("Copia esta linea en tu archivo .env (no la compartas ni la subas a un repositorio):\n");
console.log(`JWT_SECRET=${secret}`);
