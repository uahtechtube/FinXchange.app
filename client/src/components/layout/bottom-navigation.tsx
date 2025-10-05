import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, CreditCard, Receipt, Grid3X3, User } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", href: "/", icon: Home },
  { id: "services", label: "Services", href: "/services", icon: Grid3X3 },
  { id: "history", label: "History", href: "/transactions", icon: Receipt },
  { id: "cards", label: "Cards", href: "/cards", icon: CreditCard },
  { id: "profile", label: "Profile", href: "/profile", icon: User },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-[428px] bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.href)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 relative transition-colors",
                "min-h-[48px] min-w-[48px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
