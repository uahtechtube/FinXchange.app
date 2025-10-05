import { useState } from "react";
import { Eye, EyeOff, Wallet, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WalletCardProps {
  balance: string;
  currency?: string;
  className?: string;
  onAddMoney?: () => void;
  onSendMoney?: () => void;
}

export default function WalletCard({ 
  balance, 
  currency = "₦", 
  className,
  onAddMoney,
  onSendMoney 
}: WalletCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  const formatBalance = (amount: string) => {
    const num = parseFloat(amount || "0");
    return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 text-white shadow-xl",
      "bg-gradient-to-r from-primary via-primary/90 to-accent",
      className
    )}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs opacity-90 mb-1">Total Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" data-testid="wallet-balance">
                {balanceVisible 
                  ? `${currency}${formatBalance(balance)}`
                  : `${currency}••••••`
                }
              </span>
              <button 
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="text-sm opacity-75 hover:opacity-100 transition-opacity"
                data-testid="toggle-balance-visibility"
              >
                {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={onAddMoney}
            className="flex-1 bg-white text-primary hover:bg-white/90 font-semibold py-3 rounded-xl transition-all"
            data-testid="button-add-money"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Money
          </Button>
          <Button 
            onClick={onSendMoney}
            variant="outline"
            className="flex-1 bg-white/20 backdrop-blur text-white border-white/30 hover:bg-white/30 font-semibold py-3 rounded-xl transition-all"
            data-testid="button-send-money"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
