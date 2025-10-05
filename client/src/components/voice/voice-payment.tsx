import { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVoicePayment } from "@/hooks/use-voice-payment";
import { cn } from "@/lib/utils";

interface VoicePaymentProps {
  onClose?: () => void;
}

export default function VoicePayment({ onClose }: VoicePaymentProps) {
  const {
    isListening,
    isProcessing,
    transcript,
    feedback,
    confidence,
    startListening,
    stopListening,
    processCommand,
  } = useVoicePayment();

  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);

  const commands = [
    "Check my balance",
    "Send 5000 naira to John",
    "Buy airtime for 1000",
    "Pay electricity bill",
    "Show recent transactions",
  ];

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const speak = (text: string) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (feedback && isSpeechEnabled) {
      speak(feedback);
    }
  }, [feedback, isSpeechEnabled]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Voice Payment
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
              data-testid="toggle-speech"
            >
              {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Listening Indicator */}
          <div className="text-center">
            <div
              className={cn(
                "w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300",
                isListening
                  ? "bg-gradient-to-r from-primary to-accent animate-pulse"
                  : "bg-muted"
              )}
            >
              {isListening ? (
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                  <div className="w-4 h-4 bg-primary rounded-full animate-ping" />
                </div>
              ) : (
                <Mic className={cn("w-8 h-8", isListening ? "text-white" : "text-muted-foreground")} />
              )}
            </div>
            
            <Badge 
              variant={isListening ? "default" : "secondary"}
              className={cn(
                "px-3 py-1",
                isListening && "bg-primary text-primary-foreground animate-pulse"
              )}
            >
              {isListening ? "Listening..." : "Tap to speak"}
            </Badge>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{transcript}</p>
                    {confidence !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {Math.round(confidence * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Display */}
          {feedback && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm text-primary">{feedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Control Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleToggleListening}
              disabled={isProcessing}
              className={cn(
                "flex-1",
                isListening
                  ? "bg-destructive hover:bg-destructive/90"
                  : "gradient-primary"
              )}
              data-testid="button-toggle-listening"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Listening
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              data-testid="button-close-voice"
            >
              Close
            </Button>
          </div>

          {/* Sample Commands */}
          <div>
            <h4 className="font-medium text-sm mb-3">Try saying:</h4>
            <div className="space-y-2">
              {commands.map((command, index) => (
                <button
                  key={index}
                  onClick={() => processCommand(command)}
                  className="w-full text-left p-2 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                  data-testid={`sample-command-${index}`}
                >
                  "{command}"
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
