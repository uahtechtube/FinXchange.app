import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Upload, QrCode, Users, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

// QR Code generation function (simplified)
const generateQRCodeData = (user: any, amount?: string) => {
  return {
    type: 'finxchange_payment',
    userId: user.id,
    name: `${user.firstName} ${user.lastName}`,
    phone: user.phone,
    amount: amount || '',
    timestamp: Date.now(),
  };
};

export default function QRScanner() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);

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

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      setIsScanning(true);
      
      // Simulate QR scanning (in real app, use html5-qrcode library)
      toast({
        title: "Camera Started",
        description: "Point your camera at a QR code to scan",
      });
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate QR code reading from image
      toast({
        title: "QR Code Detected",
        description: "Processing QR code from image...",
      });
      
      // Mock scanned data
      setTimeout(() => {
        setScannedData({
          type: 'finxchange_payment',
          name: 'John Doe',
          phone: '+234XXXXXXXXX',
          amount: '5000.00',
        });
        toast({
          title: "QR Code Scanned",
          description: "Payment request found!",
        });
      }, 1000);
    }
  };

  const handlePaymentConfirm = () => {
    if (scannedData) {
      // Redirect to send money page with pre-filled data
      toast({
        title: "Processing Payment",
        description: `Initiating payment to ${scannedData.name}`,
      });
      setLocation("/send-money");
    }
  };

  const copyMyQR = async () => {
    const qrData = JSON.stringify(generateQRCodeData(user, amount));
    try {
      await navigator.clipboard.writeText(qrData);
      toast({
        title: "QR Data Copied",
        description: "QR code data copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy QR code data",
        variant: "destructive",
      });
    }
  };

  const shareMyQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Pay me with FinXchange',
          text: `Pay ${user?.firstName} ${user?.lastName} using FinXchange`,
          url: window.location.origin,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      toast({
        title: "Share Not Supported",
        description: "Sharing is not supported on this device",
      });
    }
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
          <h1 className="text-lg font-semibold text-foreground">QR Payment</h1>
        </div>
      </header>

      <main className="px-4 py-6">
        <Tabs defaultValue="scan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              My QR Code
            </TabsTrigger>
          </TabsList>

          {/* Scan QR Tab */}
          <TabsContent value="scan" className="space-y-6">
            {/* Camera View */}
            <Card>
              <CardHeader>
                <CardTitle>Scan QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted rounded-2xl overflow-hidden relative">
                  {isScanning ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        playsInline
                        muted
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Scanning Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-4 border-primary rounded-2xl relative">
                          <div className="absolute inset-0 border-4 border-white/30 rounded-2xl animate-pulse" />
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <QrCode className="w-16 h-16 mb-4" />
                      <p className="text-center">Camera will appear here</p>
                      <p className="text-sm text-center mt-2">
                        Position QR code within the frame to scan
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {!isScanning ? (
                    <Button
                      onClick={startCamera}
                      className="flex-1 gradient-primary"
                      data-testid="button-start-camera"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  ) : (
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-stop-camera"
                    >
                      Stop Camera
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-upload-image"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </CardContent>
            </Card>

            {/* Scanned Result */}
            {scannedData && (
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="text-primary">QR Code Scanned!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{scannedData.name}</p>
                        <p className="text-sm text-muted-foreground">{scannedData.phone}</p>
                      </div>
                    </div>
                    
                    {scannedData.amount && (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-2xl font-bold text-primary">₦{scannedData.amount}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handlePaymentConfirm}
                    className="w-full gradient-primary"
                    data-testid="button-confirm-payment"
                  >
                    Confirm Payment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Generate QR Tab */}
          <TabsContent value="generate" className="space-y-6">
            {/* Amount Input */}
            <Card>
              <CardHeader>
                <CardTitle>Request Amount (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-foreground">₦</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter amount to request"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8"
                    data-testid="input-request-amount"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Leave empty for flexible amount
                </p>
              </CardContent>
            </Card>

            {/* QR Code Display */}
            <Card>
              <CardHeader>
                <CardTitle>Your Payment QR Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-white rounded-2xl p-6 border border-border flex items-center justify-center">
                  {/* QR Code Placeholder - In real app, use qrcode library */}
                  <div className="w-full h-full bg-gradient-to-br from-muted to-background rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        QR Code for {user?.firstName} {user?.lastName}
                      </p>
                      {amount && (
                        <p className="text-lg font-bold text-primary mt-2">
                          ₦{parseFloat(amount || "0").toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground" data-testid="qr-user-name">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="qr-user-phone">
                    {user?.phone}
                  </p>
                  {amount && (
                    <p className="text-lg font-bold text-primary">
                      ₦{parseFloat(amount).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={copyMyQR}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-copy-qr"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={shareMyQR}
                    variant="outline"
                    className="flex-1"
                    data-testid="button-share-qr"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Info */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <h3 className="font-semibold text-primary mb-2">How to use this QR Code</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>1. Show this QR code to the person paying you</p>
                    <p>2. They scan it with their FinXchange app</p>
                    <p>3. Payment is processed instantly</p>
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
