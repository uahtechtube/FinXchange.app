import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Banknote, ArrowLeftRight, Users, Search, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/queryClient";
import type { Beneficiary, Wallet } from "@shared/schema";

const bankTransferSchema = z.object({
  bankCode: z.string().min(1, "Please select a bank"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => parseFloat(val) > 0,
    "Amount must be greater than 0"
  ),
  description: z.string().optional(),
  pin: z.string().length(4, "PIN must be 4 digits"),
});

const walletTransferSchema = z.object({
  recipientPhone: z.string().regex(/^(\+234|0)[7-9][0-1][0-9]{8}$/, "Please enter a valid Nigerian phone number"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => parseFloat(val) > 0,
    "Amount must be greater than 0"
  ),
  description: z.string().optional(),
  pin: z.string().length(4, "PIN must be 4 digits"),
});

type BankTransferForm = z.infer<typeof bankTransferSchema>;
type WalletTransferForm = z.infer<typeof walletTransferSchema>;

interface Bank {
  bank_name: string;
  bank_code: string;
}

export default function SendMoney() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"bank" | "wallet">("bank");
  const [verifiedAccountName, setVerifiedAccountName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);

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

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["/api/wallet"],
  });

  const { data: banks, isLoading: banksLoading } = useQuery<{ data: Bank[] }>({
    queryKey: ["/api/banks"],
  });

  const { data: beneficiaries } = useQuery<Beneficiary[]>({
    queryKey: ["/api/beneficiaries"],
  });

  const bankForm = useForm<BankTransferForm>({
    resolver: zodResolver(bankTransferSchema),
    defaultValues: {
      bankCode: "",
      accountNumber: "",
      amount: "",
      description: "",
      pin: "",
    },
  });

  const walletForm = useForm<WalletTransferForm>({
    resolver: zodResolver(walletTransferSchema),
    defaultValues: {
      recipientPhone: "",
      amount: "",
      description: "",
      pin: "",
    },
  });

  const bankTransferMutation = useMutation({
    mutationFn: async (data: BankTransferForm) => {
      const response = await apiRequest("POST", "/api/transfer/bank", {
        ...data,
        amount: parseFloat(data.amount).toFixed(2),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Initiated",
        description: "Your bank transfer is being processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/transactions");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const walletTransferMutation = useMutation({
    mutationFn: async (data: WalletTransferForm) => {
      const response = await apiRequest("POST", "/api/transfer/wallet", {
        ...data,
        amount: parseFloat(data.amount).toFixed(2),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Transfer Successful",
        description: "Money has been sent to the recipient's wallet.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocation("/transactions");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const verifyAccount = async (bankCode: string, accountNumber: string) => {
    if (bankCode && accountNumber.length === 10) {
      setIsVerifying(true);
      try {
        const response = await apiRequest("POST", "/api/verify-account", {
          bankCode,
          accountNumber,
        });
        const result = await response.json();
        if (result.success) {
          setVerifiedAccountName(result.data.account_name);
          toast({
            title: "Account Verified",
            description: `Account belongs to ${result.data.account_name}`,
          });
        } else {
          setVerifiedAccountName(null);
          toast({
            title: "Verification Failed",
            description: "Could not verify account details.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setVerifiedAccountName(null);
        toast({
          title: "Verification Failed",
          description: "Could not verify account details.",
          variant: "destructive",
        });
      }
      setIsVerifying(false);
    }
  };

  const handleBankTransfer = (data: BankTransferForm) => {
    if (!verifiedAccountName) {
      toast({
        title: "Account Not Verified",
        description: "Please verify the account details first.",
        variant: "destructive",
      });
      return;
    }
    
    bankTransferMutation.mutate({
      ...data,
      accountName: verifiedAccountName,
    } as any);
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance || "0");
    return num.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleBeneficiarySelect = (beneficiary: Beneficiary) => {
    bankForm.setValue("bankCode", beneficiary.bankCode);
    bankForm.setValue("accountNumber", beneficiary.accountNumber);
    setVerifiedAccountName(beneficiary.accountName);
  };

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
          <h1 className="text-lg font-semibold text-foreground">Send Money</h1>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-primary to-accent text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-sm opacity-90 mb-1">Available Balance</p>
              <h2 className="text-3xl font-bold" data-testid="available-balance">
                ₦{formatBalance(wallet?.balance || "0")}
              </h2>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Type Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "bank" | "wallet")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bank" className="flex items-center gap-2" data-testid="tab-bank">
              <Banknote className="w-4 h-4" />
              To Bank
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2" data-testid="tab-wallet">
              <ArrowLeftRight className="w-4 h-4" />
              To Wallet
            </TabsTrigger>
          </TabsList>

          {/* Bank Transfer Tab */}
          <TabsContent value="bank" className="space-y-6">
            {/* Beneficiaries */}
            {beneficiaries && Array.isArray(beneficiaries) && beneficiaries.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-3">Recent Beneficiaries</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {beneficiaries.slice(0, 5).map((beneficiary) => (
                    <button
                      key={beneficiary.id}
                      onClick={() => handleBeneficiarySelect(beneficiary)}
                      className="flex flex-col items-center gap-2 min-w-[80px] p-2 hover:bg-muted rounded-lg transition-colors"
                      data-testid={`beneficiary-${beneficiary.id}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {beneficiary.accountName.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <span className="text-xs text-center">{beneficiary.nickname || beneficiary.accountName.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bank Transfer Form */}
            <Card>
              <CardContent className="p-6">
                <Form {...bankForm}>
                  <form onSubmit={bankForm.handleSubmit(handleBankTransfer)} className="space-y-4">
                    <FormField
                      control={bankForm.control}
                      name="bankCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Bank</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                setVerifiedAccountName(null);
                              }}
                              value={field.value}
                              disabled={banksLoading}
                            >
                              <SelectTrigger data-testid="select-bank">
                                <SelectValue placeholder="Choose a bank" />
                              </SelectTrigger>
                              <SelectContent>
                                {banks?.data?.map((bank) => (
                                  <SelectItem key={bank.bank_code} value={bank.bank_code}>
                                    {bank.bank_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bankForm.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="Enter 10-digit account number"
                              maxLength={10}
                              onChange={(e) => {
                                field.onChange(e);
                                setVerifiedAccountName(null);
                                if (e.target.value.length === 10) {
                                  const bankCode = bankForm.getValues("bankCode");
                                  verifyAccount(bankCode, e.target.value);
                                }
                              }}
                              data-testid="input-account-number"
                            />
                          </FormControl>
                          {isVerifying && (
                            <p className="text-xs text-muted-foreground">Verifying account...</p>
                          )}
                          {verifiedAccountName && (
                            <p className="text-xs text-success flex items-center gap-1">
                              ✓ {verifiedAccountName} - Verified
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bankForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-foreground">₦</span>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-8"
                                data-testid="input-amount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bankForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="What's this for?"
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={bankForm.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction PIN</FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={4}
                                value={field.value}
                                onChange={field.onChange}
                                type={showPin ? "text" : "password"}
                                data-testid="input-transaction-pin"
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
                          <div className="flex justify-center mt-2">
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              data-testid="toggle-pin-visibility"
                            >
                              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full gradient-primary"
                      disabled={bankTransferMutation.isPending || !verifiedAccountName}
                      data-testid="button-send-bank"
                    >
                      {bankTransferMutation.isPending ? "Processing..." : "Send Money"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wallet Transfer Tab */}
          <TabsContent value="wallet" className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Form {...walletForm}>
                  <form onSubmit={walletForm.handleSubmit((data) => walletTransferMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={walletForm.control}
                      name="recipientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="tel"
                              placeholder="+234 80X XXX XXXX"
                              data-testid="input-recipient-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={walletForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-foreground">₦</span>
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="pl-8"
                                data-testid="input-wallet-amount"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={walletForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="What's this for?"
                              data-testid="input-wallet-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={walletForm.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction PIN</FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP
                                maxLength={4}
                                value={field.value}
                                onChange={field.onChange}
                                type={showPin ? "text" : "password"}
                                data-testid="input-wallet-transaction-pin"
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
                      className="w-full gradient-secondary"
                      disabled={walletTransferMutation.isPending}
                      data-testid="button-send-wallet"
                    >
                      {walletTransferMutation.isPending ? "Processing..." : "Send Money"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
