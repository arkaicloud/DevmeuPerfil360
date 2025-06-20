import React from 'react';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Switch, Route } from "wouter";
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
import { Toaster } from "@/components/ui/toaster";

function Router() {
  return React.createElement(Switch, null,
    React.createElement(Route, { path: "/", component: Home }),
    React.createElement(Route, { path: "/test", component: Test }),
    React.createElement(Route, { path: "/results", component: Results }),
    React.createElement(Route, { path: "/checkout", component: CheckoutModern }),
    React.createElement(Route, { path: "/dashboard", component: Dashboard }),
    React.createElement(Route, { path: "/find-results", component: FindResults }),
    React.createElement(Route, { path: "/payment-success", component: PaymentSuccess }),
    React.createElement(Route, { path: "/payment-test", component: PaymentTest }),
    React.createElement(Route, { path: "/stripe-direct", component: StripeDirect }),
    React.createElement(Route, { path: "/login", component: Login }),
    React.createElement(Route, { path: "/admin", component: AdminLogin }),
    React.createElement(Route, { path: "/admin/dashboard", component: AdminDashboard }),
    React.createElement(Route, { path: "/admin/email-config", component: AdminEmailConfig }),
    React.createElement(Route, { path: "/admin/email-templates", component: AdminEmailTemplates }),
    React.createElement(Route, { path: "/admin/pricing", component: AdminPricing }),
    React.createElement(Route, { component: NotFound })
  );
}

export default function SimpleApp() {
  return React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(TooltipProvider, null,
      React.createElement('div', { className: "mobile-container" },
        React.createElement(Toaster),
        React.createElement(Router)
      )
    )
  );
}