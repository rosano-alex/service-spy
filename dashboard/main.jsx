import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import BinocsDashboard from "./index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BinocsDashboard />
  </StrictMode>
);
