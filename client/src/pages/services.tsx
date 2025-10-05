import { useState } from "react";
import { useLocation } from "wouter";
import { Smartphone, Wifi, Zap, Tv, Globe, CreditCard, MoreHorizontal, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'communication' | 'utilities' | 'entertainment' | 'financial';
  isPopular?: boolean;
  isComingSoon?: boolean;
}

const services: Service[] = [
  {
    id: 'airtime',
    title: 'Airtime Top-up',
    description: 'Buy airtime for all networks',
    icon: Smartphone,
    color: 'bg-primary/10 text-primary',
    category: 'communication',
    isPopular: true,
  },
  {
    id: 'data',
    title: 'Data Bundles',
    description: 'Purchase data plans',
    icon: Wifi,
    color: 'bg-secondary/10 text-secondary',
    category: 'communication',
    isPopular: true,
  },
  {
    id: 'electricity',
    title: 'Electricity Bills',
    description: 'Pay NEPA/PHCN bills',
    icon: Zap,
    color: 'bg-warning/10 text-warning',
    category: 'utilities',
  },
  {
    id: 'cable-tv',
    title: 'Cable TV',
    description: 'DSTV, GOTV, StarTimes',
    icon: Tv,
    color: 'bg-destructive/10 text-destructive',
    category: 'entertainment',
  },
  {
    id: 'internet',
    title: 'Internet Bills',
    description: 'Pay internet subscriptions',
    icon: Globe,
    color: 'bg-accent/10 text-accent',
    category: 'utilities',
  },
  {
    id: 'exam-fees',
    title: 'Exam Fees',
    description: 'WAEC, JAMB, NECO payments',
    icon: CreditCard,
    color: 'bg-success/10 text-success',
    category: 'financial',
    isComingSoon: true,
  },
];

const categories = [
  { id: 'all', label: 'All Services' },
  { id: 'communication', label: 'Communication' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'financial', label: 'Financial' },
];

export default function Services() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredServices = services.filter(service => {
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleServiceClick = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service?.isComingSoon) {
      toast({
        title: "Coming Soon",
        description: `${service.title} will be available soon!`,
      });
      return;
    }

    toast({
      title: "Service Selected",
      description: `${service?.title} feature is being implemented.`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Services</h1>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-services"
          />
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              data-testid={`category-${category.id}`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Popular Services */}
        {activeCategory === 'all' && searchQuery === '' && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Popular Services</h2>
            <div className="grid grid-cols-2 gap-3">
              {services.filter(s => s.isPopular).map((service) => {
                const Icon = service.icon;
                return (
                  <Card 
                    key={service.id}
                    className="cursor-pointer hover:shadow-md transition-all card-hover"
                    onClick={() => handleServiceClick(service.id)}
                  >
                    <CardContent className="p-4">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3", service.color)}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-sm text-foreground">{service.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* All Services */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {activeCategory === 'all' ? 'All Services' : categories.find(c => c.id === activeCategory)?.label}
            </h2>
            <span className="text-sm text-muted-foreground">{filteredServices.length} services</span>
          </div>

          {filteredServices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No services found</h3>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your search or selecting a different category
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => {
                const Icon = service.icon;
                return (
                  <Card 
                    key={service.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => handleServiceClick(service.id)}
                    data-testid={`service-${service.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", service.color)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{service.title}</h3>
                            {service.isPopular && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                                Popular
                              </Badge>
                            )}
                            {service.isComingSoon && (
                              <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                                Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Access Banner */}
        <Card className="gradient-primary text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="font-bold text-lg mb-2">Need Something Else?</h3>
              <p className="text-sm opacity-90 mb-4">
                Can't find what you're looking for? Contact our support team for assistance.
              </p>
              <Button 
                variant="outline" 
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                onClick={() => toast({ title: "Support", description: "Contact support feature coming soon!" })}
                data-testid="contact-support"
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
