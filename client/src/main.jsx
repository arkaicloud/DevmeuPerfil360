import React from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

// Import pages
import Home from "@/pages/home-responsive";
import Test from "@/pages/test";
import Results from "@/pages/results";
import CheckoutModern from "@/pages/checkout-modern";
import Dashboard from "@/pages/dashboard";
import FindResults from "@/pages/find-results";
import PaymentSuccess from "@/pages/payment-success";
import PaymentTest from "@/pages/payment-test";
import StripeDirect from "@/pages/stripe-direct";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard-new";
import AdminEmailConfig from "@/pages/admin-email-config";
import AdminEmailTemplates from "@/pages/admin-email-templates";
import AdminPricing from "@/pages/admin-pricing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/test" component={Test} />
      <Route path="/results" component={Results} />
      <Route path="/checkout" component={CheckoutModern} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/find-results" component={FindResults} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-test" component={PaymentTest} />
      <Route path="/stripe-direct" component={StripeDirect} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/email-config" component={AdminEmailConfig} />
      <Route path="/admin/email-templates" component={AdminEmailTemplates} />
      <Route path="/admin/pricing" component={AdminPricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="mobile-container">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);