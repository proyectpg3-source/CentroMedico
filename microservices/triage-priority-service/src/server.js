import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

const port = Number(process.env.PORT ?? 4101);
const app = createApp();

app.listen(port, () => {
  console.log(`Triage priority service en http://localhost:${port}`);
});
