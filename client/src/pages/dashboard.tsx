import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bell, Settings, Plus, Mic, CloudDownload } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import BottomNavigation from "@/components/layout/bottom-navigation";
import WalletCard from "@/components/wallet/wallet-card";
import VirtualAccountCard from "@/components/wallet/virtual-account-card";
import QuickActions from "@/components/dashboard/quick-actions";
import TransactionList from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Wallet, VirtualAccount, Transaction, OfflineTransaction } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: wallet, isLoading: walletLoading } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
    enabled: !!user,
  });

  const { data: virtualAccount, isLoading: accountLoading } = useQuery<VirtualAccount>({
    queryKey: ["/api/virtual-account"],
    enabled: !!user,
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: offlineTransactions } = useQuery<OfflineTransaction[]>({
    queryKey: ["/api/offline-transactions"],
    enabled: !!user,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'bank-transfer':
      case 'wallet-transfer':
        setLocation("/send-money");
        break;
      case 'qr-pay':
        setLocation("/qr-scanner");
        break;
      case 'airtime':
      case 'data':
      case 'electricity':
      case 'cable-tv':
        setLocation("/services");
        break;
      case 'beneficiaries':
        setLocation("/profile");
        break;
      default:
        toast({
          title: "Coming Soon",
          description: `${actionId} feature will be available soon!`,
        });
    }
  };

  const handleVoicePayment = () => {
    toast({
      title: "Voice Payment",
      description: "Say 'Send money' or 'Check balance' to get started",
    });
  };

  const handleOfflineQueue = () => {
    if (offlineTransactions && offlineTransactions.length > 0) {
      toast({
        title: "Offline Transactions",
        description: `${offlineTransactions.length} transactions queued for processing`,
      });
    } else {
      toast({
        title: "Offline Mode",
        description: "No queued transactions. You can make transactions even when offline!",
      });
    }
  };

  if (walletLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-bold">
              <span data-testid="user-initials">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Welcome back,</p>
              <h1 className="text-sm font-semibold text-foreground" data-testid="user-name">
                {user?.firstName} {user?.lastName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="relative p-2 hover:bg-muted rounded-full transition-colors"
              data-testid="notifications-button"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </button>
            <button 
              onClick={() => setLocation("/profile")}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              data-testid="settings-button"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-6 py-4">
        {/* Wallet Card */}
        <WalletCard
          balance={wallet?.balance || "0.00"}
          onAddMoney={() => toast({ title: "Add Money", description: "Fund wallet feature coming soon!" })}
          onSendMoney={() => setLocation("/send-money")}
        />

        {/* Virtual Account Card */}
        {virtualAccount && (
          <VirtualAccountCard
            accountNumber={virtualAccount.accountNumber}
            accountName={virtualAccount.accountName}
            bankName={virtualAccount.bankName}
            isActive={virtualAccount.isActive ?? true}
          />
        )}

        {/* Quick Actions */}
        <QuickActions onActionClick={handleQuickAction} />

        {/* Special Features */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Special Features</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleVoicePayment}
              className="bg-gradient-to-r from-accent to-destructive rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1"
              data-testid="voice-payment-button"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-semibold">Voice Pay</h3>
              </div>
              <p className="text-xs opacity-90 text-left">Hands-free payments with voice commands</p>
            </button>

            <button
              onClick={handleOfflineQueue}
              className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              data-testid="offline-mode-button"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary">
                  <CloudDownload className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground">Offline Mode</h3>
              </div>
              <p className="text-xs text-muted-foreground text-left">Queue transactions without internet</p>
              {offlineTransactions && offlineTransactions.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-full rounded-full w-2/3"></div>
                  </div>
                  <span className="text-xs font-medium text-primary">
                    {offlineTransactions.length}
                  </span>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
            <button
              onClick={() => setLocation("/transactions")}
              className="text-sm text-primary font-medium hover:underline"
              data-testid="view-all-link"
            >
              View All
            </button>
          </div>

          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                  </div>
                  <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <TransactionList
              transactions={transactions || []}
              onTransactionClick={() => setLocation("/transactions")}
            />
          )}
        </section>

        {/* KYC Verification Notice */}
        {user?.kycStatus !== 'verified' && (
          <section className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground mb-1">
                  Complete Your KYC Verification
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your BVN, NIN, and proof of address to unlock full features and higher transaction limits.
                </p>
                <button
                  onClick={() => setLocation("/profile")}
                  className="text-xs font-semibold text-warning hover:underline"
                  data-testid="kyc-verification-link"
                >
                  Verify Now →
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating QR Button */}
      <button
        onClick={() => setLocation("/qr-scanner")}
        className="fixed bottom-20 right-4 w-14 h-14 bg-gradient-to-r from-primary to-accent text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 flex items-center justify-center z-40"
        data-testid="floating-qr-button"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm2 2V5h1v1h-1z" clipRule="evenodd" />
        </svg>
      </button>

      <BottomNavigation />
    </div>
  );
}
