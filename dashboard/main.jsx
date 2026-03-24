import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ServiceSpyDashboard from "./index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ServiceSpyDashboard />
  </StrictMode>
);
