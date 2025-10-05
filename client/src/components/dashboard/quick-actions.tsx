import { Banknote, ArrowLeftRight, Smartphone, Wifi, Zap, Tv, QrCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  className?: string;
  onActionClick?: (actionId: string) => void;
}

const quickActions: QuickAction[] = [
  { id: "bank-transfer", label: "To Bank", icon: Banknote, color: "bg-primary/10 text-primary" },
  { id: "wallet-transfer", label: "To Wallet", icon: ArrowLeftRight, color: "bg-secondary/10 text-secondary" },
  { id: "airtime", label: "Airtime", icon: Smartphone, color: "bg-accent/10 text-accent" },
  { id: "data", label: "Data", icon: Wifi, color: "bg-success/10 text-success" },
  { id: "electricity", label: "Electricity", icon: Zap, color: "bg-warning/10 text-warning" },
  { id: "cable-tv", label: "Cable TV", icon: Tv, color: "bg-destructive/10 text-destructive" },
  { id: "qr-pay", label: "QR Pay", icon: QrCode, color: "bg-gradient-to-r from-primary to-accent text-white" },
  { id: "beneficiaries", label: "Saved", icon: Users, color: "bg-gradient-to-r from-secondary to-success text-white" },
];

export default function QuickActions({ className, onActionClick }: QuickActionsProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
      <div className="grid grid-cols-4 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isGradient = action.color.includes('gradient');
          
          return (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 bg-card rounded-xl shadow-sm border border-border",
                "hover:shadow-md transition-all duration-200",
                "hover:-translate-y-1 active:translate-y-0",
                "min-h-[80px]"
              )}
              data-testid={`quick-action-${action.id}`}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                action.color
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-foreground text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
