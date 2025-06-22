import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  // DEVELOPMENT MODE - Hide all test/checkout/login functionality
  const isDevelopmentMode = false;

  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Development mode - hide user-facing routes */}
      {!isDevelopmentMode && <Route path="/test" component={Test} />}
      {!isDevelopmentMode && <Route path="/results/:id" component={Results} />}
      {!isDevelopmentMode && <Route path="/checkout/:testId" component={CheckoutModern} />}
      {!isDevelopmentMode && <Route path="/dashboard/:userId" component={Dashboard} />}
      {!isDevelopmentMode && <Route path="/find-results" component={FindResults} />}
      {!isDevelopmentMode && <Route path="/login" component={Login} />}
      
      {/* Keep admin routes always available */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/email-config" component={AdminEmailConfig} />
      <Route path="/admin/email-templates" component={AdminEmailTemplates} />
      <Route path="/admin/pricing" component={AdminPricing} />
      
      {/* Keep payment test routes for development */}
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-test" component={PaymentTest} />
      <Route path="/stripe-direct" component={StripeDirect} />
      
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

export default App;