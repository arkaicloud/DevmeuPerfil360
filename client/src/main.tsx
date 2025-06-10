import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Prevent any global Stripe loading
if (typeof window !== 'undefined') {
  // Disable Stripe.js auto-loading
  window.StripeCheckout = undefined;
}

createRoot(document.getElementById("root")!).render(<App />);