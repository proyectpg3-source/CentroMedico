import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./auth/AuthContext";
import { AppearanceProvider } from "./components/AppearanceProvider";

export default function App() {
  return <AppearanceProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></AppearanceProvider>;
}
