import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
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
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard-new";
import AdminEmailConfig from "@/pages/admin-email-config";
import AdminEmailTemplates from "@/pages/admin-email-templates";
import AdminPricing from "@/pages/admin-pricing";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Temporarily disable Clerk due to initialization issues
if (!clerkPubKey || clerkPubKey.startsWith('sk_') || clerkPubKey.includes('BEGIN PUBLIC KEY')) {
  console.warn('Clerk publishable key missing or invalid. Running without Clerk authentication.');
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/test" component={Test} />
      <Route path="/results/:id" component={Results} />
      <Route path="/checkout" component={CheckoutModern} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-test" component={PaymentTest} />
      <Route path="/dashboard/:userId" component={Dashboard} />
      <Route path="/find-results" component={FindResults} />
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/email-config" component={AdminEmailConfig} />
      <Route path="/admin/email-templates" component={AdminEmailTemplates} />
      <Route path="/admin/pricing" component={AdminPricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Temporarily disable Clerk to focus on core functionality
  const hasValidClerkKey = false; // Disabled due to initialization issues

  if (hasValidClerkKey) {
    return (
      <ClerkProvider publishableKey={clerkPubKey}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="mobile-container">
              <Toaster />
              <Router />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    );
  }

  // Fallback without Clerk for now
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