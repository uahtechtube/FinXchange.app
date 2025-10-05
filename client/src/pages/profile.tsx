import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, User, Shield, Bell, CreditCard, Users, HelpCircle, 
  LogOut, Edit, Camera, Lock, Phone, Mail, Calendar, MapPin,
  CheckCircle, XCircle, Clock, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Beneficiary } from "@shared/schema";

const setPinSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 digits"),
  confirmPin: z.string().length(4, "PIN must be 4 digits"),
}).refine((data) => data.pin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

type SetPinForm = z.infer<typeof setPinSchema>;

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

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

  const { data: beneficiaries } = useQuery<Beneficiary[]>({
    queryKey: ["/api/beneficiaries"],
  });

  const { data: kycDocuments } = useQuery({
    queryKey: ["/api/kyc-documents"],
    enabled: false, // Enable when KYC endpoint is implemented
  });

  const setPinForm = useForm<SetPinForm>({
    resolver: zodResolver(setPinSchema),
    defaultValues: {
      pin: "",
      confirmPin: "",
    },
  });

  const setPinMutation = useMutation({
    mutationFn: async (data: SetPinForm) => {
      const response = await apiRequest("POST", "/api/auth/set-pin", {
        pin: data.pin,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "PIN Set Successfully",
        description: "Your transaction PIN has been updated.",
      });
      setPinForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Set PIN",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getKycStatus = () => {
    if (!user?.kycStatus) return { status: 'pending', text: 'Pending', color: 'bg-warning/10 text-warning' };
    
    switch (user.kycStatus) {
      case 'verified':
        return { status: 'verified', text: 'Verified', color: 'bg-success/10 text-success' };
      case 'rejected':
        return { status: 'rejected', text: 'Rejected', color: 'bg-destructive/10 text-destructive' };
      default:
        return { status: 'pending', text: 'Pending', color: 'bg-warning/10 text-warning' };
    }
  };

  const kycStatus = getKycStatus();

  const profileMenuItems = [
    {
      id: 'beneficiaries',
      icon: Users,
      title: 'Saved Beneficiaries',
      description: 'Manage your saved accounts',
      badge: (beneficiaries && Array.isArray(beneficiaries)) ? beneficiaries.length : 0,
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Manage your alerts',
      badge: '3',
    },
    {
      id: 'help',
      icon: HelpCircle,
      title: 'Help & Support',
      description: 'Get assistance',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        </div>
      </header>

      <main className="px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white text-2xl font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-card border-2 border-background rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-foreground" data-testid="user-full-name">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <p className="text-muted-foreground" data-testid="user-email">{user?.email}</p>
                    <p className="text-muted-foreground" data-testid="user-phone">{user?.phone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={kycStatus.color}>
                        {kycStatus.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {kycStatus.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {kycStatus.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {kycStatus.text}
                      </Badge>
                      {user?.isEmailVerified && (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          <Mail className="w-3 h-3 mr-1" />
                          Email Verified
                        </Badge>
                      )}
                      {user?.isPhoneVerified && (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          <Phone className="w-3 h-3 mr-1" />
                          Phone Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Menu */}
            <div className="space-y-3">
              {profileMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Card 
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      toast({
                        title: item.title,
                        description: `${item.title} feature coming soon!`,
                      });
                    }}
                    data-testid={`menu-${item.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary">{item.badge}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Logout */}
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Transaction PIN */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Transaction PIN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Set or update your 4-digit PIN for secure transactions.
                  </p>
                </div>

                <Form {...setPinForm}>
                  <form onSubmit={setPinForm.handleSubmit((data) => setPinMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={setPinForm.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New PIN</FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={4}
                                value={field.value}
                                onChange={field.onChange}
                                type="password"
                                data-testid="input-new-pin"
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={setPinForm.control}
                      name="confirmPin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm PIN</FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={4}
                                value={field.value}
                                onChange={field.onChange}
                                type="password"
                                data-testid="input-confirm-pin"
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={setPinMutation.isPending}
                      data-testid="button-set-pin"
                    >
                      {setPinMutation.isPending ? "Setting PIN..." : "Set Transaction PIN"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Extra security for your account</p>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Device Management</h4>
                    <p className="text-sm text-muted-foreground">Manage trusted devices</p>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Login Alerts</h4>
                    <p className="text-sm text-muted-foreground">Get notified of new logins</p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            {/* KYC Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  KYC Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${kycStatus.color}`}>
                    {kycStatus.status === 'verified' && <CheckCircle className="w-6 h-6" />}
                    {kycStatus.status === 'rejected' && <XCircle className="w-6 h-6" />}
                    {kycStatus.status === 'pending' && <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{kycStatus.text}</h3>
                    <p className="text-sm text-muted-foreground">
                      {kycStatus.status === 'verified' && "Your identity has been verified"}
                      {kycStatus.status === 'pending' && "Your documents are being reviewed"}
                      {kycStatus.status === 'rejected' && "Please resubmit your documents"}
                    </p>
                  </div>
                </div>

                {kycStatus.status !== 'verified' && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Required Documents:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Bank Verification Number (BVN)</li>
                      <li>• National Identification Number (NIN)</li>
                      <li>• Proof of Address (Utility bill, etc.)</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KYC Form */}
            {kycStatus.status !== 'verified' && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label>BVN (Bank Verification Number)</Label>
                      <Input placeholder="Enter your 11-digit BVN" data-testid="input-bvn" />
                    </div>

                    <div>
                      <Label>NIN (National Identification Number)</Label>
                      <Input placeholder="Enter your 11-digit NIN" data-testid="input-nin" />
                    </div>

                    <div>
                      <Label>Proof of Address</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, JPG, PNG (Max 5MB)
                        </p>
                      </div>
                    </div>

                    <Button className="w-full" data-testid="button-submit-kyc">
                      Submit for Verification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KYC Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Higher transaction limits</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Access to all features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Enhanced account security</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <span className="text-sm">Priority customer support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
