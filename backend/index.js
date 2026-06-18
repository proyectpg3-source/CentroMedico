require("dotenv").config({ quiet: true });

const app = require("./src/app");

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
