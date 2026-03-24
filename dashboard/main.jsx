import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import service-spyDashboard from "./index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <service-spyDashboard />
  </StrictMode>
);
