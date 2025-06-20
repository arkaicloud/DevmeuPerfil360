
import React from "react";
import { createRoot } from "react-dom/client";
import TestApp from "./TestApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>
);
