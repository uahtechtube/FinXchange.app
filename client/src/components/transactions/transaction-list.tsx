import { ArrowDown, ArrowUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@shared/schema";

interface TransactionListProps {
  transactions: Transaction[];
  className?: string;
  onTransactionClick?: (transaction: Transaction) => void;
  showAll?: boolean;
}

export default function TransactionList({ 
  transactions, 
  className,
  onTransactionClick,
  showAll = false 
}: TransactionListProps) {
  const formatAmount = (amount: string, type: string) => {
    const num = parseFloat(amount);
    const isCredit = type === 'deposit' || (type === 'wallet_transfer' && num > 0);
    const prefix = isCredit ? '+' : '-';
    const absAmount = Math.abs(num).toLocaleString("en-NG", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return { prefix, amount: absAmount, isCredit };
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown date';
    
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString("en-NG", { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getTransactionIcon = (type: string, isCredit: boolean) => {
    if (type === 'deposit' || isCredit) {
      return <ArrowDown className="w-4 h-4" />;
    }
    return <ArrowUp className="w-4 h-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-success/10 text-success text-xs">Success</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">Pending</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const displayTransactions = showAll ? transactions : transactions.slice(0, 5);

  if (!transactions.length) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayTransactions.map((transaction) => {
        const { prefix, amount, isCredit } = formatAmount(transaction.amount, transaction.type);
        
        return (
          <div
            key={transaction.id}
            onClick={() => onTransactionClick?.(transaction)}
            className={cn(
              "flex items-center justify-between p-4 bg-card rounded-xl border border-border",
              "hover:bg-muted/50 transition-colors cursor-pointer",
              onTransactionClick && "active:scale-95 transition-transform"
            )}
            data-testid={`transaction-${transaction.id}`}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isCredit ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                transaction.status === 'pending' && "bg-warning/10 text-warning"
              )}>
                {transaction.status === 'pending' ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  getTransactionIcon(transaction.type, isCredit)
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground" data-testid={`transaction-description-${transaction.id}`}>
                  {transaction.description}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`transaction-date-${transaction.id}`}>
                  {formatDate(transaction.createdAt!)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                "font-semibold text-sm",
                isCredit ? "text-success" : "text-destructive",
                transaction.status === 'pending' && "text-muted-foreground"
              )} data-testid={`transaction-amount-${transaction.id}`}>
                {prefix}₦{amount}
              </p>
              {getStatusBadge(transaction.status || 'pending')}
            </div>
          </div>
        );
      })}
      
      {!showAll && transactions.length > 5 && (
        <div className="text-center pt-2">
          <button className="text-sm text-primary font-medium hover:underline" data-testid="view-all-transactions">
            View All Transactions
          </button>
        </div>
      )}
    </div>
  );
}
