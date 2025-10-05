import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileContainerProps {
  children: ReactNode;
  className?: string;
}

export default function MobileContainer({ children, className }: MobileContainerProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      "max-w-[428px] mx-auto",
      "shadow-xl shadow-black/10",
      "relative overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}
