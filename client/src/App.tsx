import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/auth-context";
import MobileContainer from "./components/layout/mobile-container";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import VerifyOTP from "@/pages/auth/verify-otp";
import SendMoney from "@/pages/send-money";
import Services from "@/pages/services";
import Transactions from "@/pages/transactions";
import Profile from "@/pages/profile";
import QRScanner from "@/pages/qr-scanner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-otp" component={VerifyOTP} />
      <Route path="/send-money" component={SendMoney} />
      <Route path="/services" component={Services} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/profile" component={Profile} />
      <Route path="/qr-scanner" component={QRScanner} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <MobileContainer>
            <Router />
          </MobileContainer>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
