import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Smartphone, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const otpSchema = z.object({
  code: z.string().min(6, "Please enter the 6-digit code"),
});

type OTPForm = z.infer<typeof otpSchema>;

export default function VerifyOTP() {
  const [, setLocation] = useLocation();
  const { verifyOTP, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const type = urlParams.get('type') || 'registration';

  // Redirect if already authenticated or missing userId
  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (!userId) {
    setLocation("/login");
    return null;
  }

  const form = useForm<OTPForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const onSubmit = async (data: OTPForm) => {
    try {
      await verifyOTP(data.code, type, userId);
      toast({
        title: "Verification Successful!",
        description: "Your account has been verified successfully.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResendOTP = () => {
    // TODO: Implement resend OTP functionality
    toast({
      title: "Code Sent",
      description: "A new verification code has been sent to your phone.",
    });
    setCountdown(300);
    setCanResend(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl shadow-xl border border-border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => setLocation("/register")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="w-16 h-16 bg-gradient-to-r from-secondary to-success rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Verify Your Phone</h1>
            <p className="text-muted-foreground mt-2">
              Enter the 6-digit code sent to your phone number
            </p>
          </div>

          {/* OTP Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Verification Code</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={field.value}
                          onChange={field.onChange}
                          data-testid="input-otp"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-12 h-12 text-lg font-semibold" />
                            <InputOTPSlot index={1} className="w-12 h-12 text-lg font-semibold" />
                            <InputOTPSlot index={2} className="w-12 h-12 text-lg font-semibold" />
                            <InputOTPSlot index={3} className="w-12 h-12 text-lg font-semibold" />
                            <InputOTPSlot index={4} className="w-12 h-12 text-lg font-semibold" />
                            <InputOTPSlot index={5} className="w-12 h-12 text-lg font-semibold" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Timer */}
              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Code expires in{" "}
                    <span className="font-semibold text-destructive" data-testid="countdown">
                      {formatTime(countdown)}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-destructive">Code has expired</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={form.formState.isSubmitting || form.watch("code").length !== 6}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-secondary to-success text-white font-semibold"
                data-testid="button-verify"
              >
                {form.formState.isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Verifying...
                  </div>
                ) : (
                  "Verify Phone Number"
                )}
              </Button>
            </form>
          </Form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendOTP}
              disabled={!canResend}
              className="text-primary font-semibold hover:underline disabled:text-muted-foreground disabled:hover:no-underline"
              data-testid="button-resend-otp"
            >
              {canResend ? "Resend Code" : "Resend available after timer expires"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
