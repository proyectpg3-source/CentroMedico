import dotenv from "dotenv";
import { createApp } from "./app.js";

dotenv.config();

const port = Number(process.env.PORT ?? 4102);
const app = createApp();

app.listen(port, () => {
  console.log(`Inventory alerts service en http://localhost:${port}`);
});
