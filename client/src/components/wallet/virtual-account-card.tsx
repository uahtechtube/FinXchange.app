import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface VirtualAccountCardProps {
  accountNumber: string;
  accountName: string;
  bankName: string;
  isActive?: boolean;
  className?: string;
}

export default function VirtualAccountCard({
  accountNumber,
  accountName,
  bankName,
  isActive = true,
  className
}: VirtualAccountCardProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      toast({
        title: "Account number copied!",
        description: "The account number has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy account number. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl p-4 shadow-sm border border-border transition-all duration-300",
      "hover:shadow-md hover:-translate-y-1",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Virtual Account</h3>
        <Badge 
          variant={isActive ? "default" : "secondary"}
          className={cn(
            "text-xs",
            isActive && "bg-success/10 text-success hover:bg-success/20"
          )}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
      
      <div className="bg-muted rounded-xl p-4">
        <p className="text-xs text-muted-foreground mb-1">Account Number</p>
        <div className="flex items-center justify-between mb-2">
          <p className="text-lg font-bold text-foreground tracking-wider" data-testid="account-number">
            {accountNumber}
          </p>
          <button
            onClick={copyAccountNumber}
            className="text-primary hover:text-primary/80 transition-colors p-1"
            data-testid="copy-account-number"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Account Name</p>
          <p className="text-sm font-medium text-foreground" data-testid="account-name">
            {accountName}
          </p>
        </div>
        
        <div className="mt-2">
          <p className="text-xs text-muted-foreground" data-testid="bank-name">
            {bankName}
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            Transfers to this account credit your wallet instantly
          </p>
        </div>
      </div>
    </div>
  );
}
