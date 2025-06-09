import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Test from "@/pages/test";
import Results from "@/pages/results";
import Checkout from "@/pages/checkout";
import Dashboard from "@/pages/dashboard";
import FindResults from "@/pages/find-results";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/test" component={Test} />
      <Route path="/results/:id" component={Results} />
      <Route path="/checkout/:testId" component={Checkout} />
      <Route path="/dashboard/:userId" component={Dashboard} />
      <Route path="/find-results" component={FindResults} />
      <Route path="/login" component={Login} />
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
