require("dotenv").config({ quiet: true });

const { assertSecureEnv } = require("./src/config/env");

try {
  assertSecureEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = require("./src/app");

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
