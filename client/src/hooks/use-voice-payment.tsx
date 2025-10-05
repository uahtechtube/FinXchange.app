import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface VoiceCommand {
  type: 'balance' | 'send' | 'airtime' | 'transactions' | 'unknown';
  params?: {
    amount?: number;
    recipient?: string;
    service?: string;
  };
}

export function useVoicePayment() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: wallet } = useQuery({
    queryKey: ["/api/wallet"],
    enabled: !!user,
  });

  const initializeSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Supported",
        description: "Your browser doesn't support voice commands.",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setFeedback("");
      setConfidence(null);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0];
      const spokenText = result[0].transcript;
      const confidenceLevel = result[0].confidence;
      
      setTranscript(spokenText);
      setConfidence(confidenceLevel);
      processCommand(spokenText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setFeedback("Sorry, I couldn't understand that. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [toast]);

  const parseCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase();
    
    // Balance check
    if (lowerText.includes('balance') || lowerText.includes('check balance')) {
      return { type: 'balance' };
    }
    
    // Send money
    const sendMatch = lowerText.match(/send.*?(\d+(?:\.\d+)?)\s*(?:naira|₦)?\s*(?:to\s+(.+?))?$/i);
    if (lowerText.includes('send') && sendMatch) {
      return {
        type: 'send',
        params: {
          amount: parseFloat(sendMatch[1]),
          recipient: sendMatch[2]?.trim() || undefined
        }
      };
    }
    
    // Airtime purchase
    const airtimeMatch = lowerText.match(/(?:buy\s+)?airtime.*?(\d+(?:\.\d+)?)/i);
    if (lowerText.includes('airtime') && airtimeMatch) {
      return {
        type: 'airtime',
        params: {
          amount: parseFloat(airtimeMatch[1])
        }
      };
    }
    
    // Transactions
    if (lowerText.includes('transaction') || lowerText.includes('history')) {
      return { type: 'transactions' };
    }
    
    return { type: 'unknown' };
  };

  const processCommand = useCallback((spokenText: string) => {
    setIsProcessing(true);
    
    const command = parseCommand(spokenText);
    
    switch (command.type) {
      case 'balance':
        const balance = (wallet?.balance as string | null) || "0";
        const formattedBalance = parseFloat(balance).toLocaleString("en-NG", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        setFeedback(`Your current balance is ${formattedBalance} naira`);
        break;
        
      case 'send':
        if (command.params?.amount) {
          setFeedback(`I'll help you send ${command.params.amount} naira${command.params.recipient ? ` to ${command.params.recipient}` : ''}. Opening send money page.`);
          setTimeout(() => {
            setLocation('/send-money');
          }, 2000);
        } else {
          setFeedback("I couldn't understand the amount. Please say something like 'Send 5000 naira to John'");
        }
        break;
        
      case 'airtime':
        if (command.params?.amount) {
          setFeedback(`I'll help you buy ${command.params.amount} naira airtime. Opening services page.`);
          setTimeout(() => {
            setLocation('/services');
          }, 2000);
        } else {
          setFeedback("I couldn't understand the amount. Please say something like 'Buy airtime for 1000'");
        }
        break;
        
      case 'transactions':
        setFeedback("Opening your transaction history.");
        setTimeout(() => {
          setLocation('/transactions');
        }, 1500);
        break;
        
      case 'unknown':
      default:
        setFeedback("I didn't understand that command. Try saying 'Check balance', 'Send money', or 'Buy airtime'.");
        break;
    }
    
    setIsProcessing(false);
  }, [wallet, setLocation]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initializeSpeechRecognition();
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast({
          title: "Voice Recognition Error",
          description: "Failed to start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [initializeSpeechRecognition, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    feedback,
    confidence,
    startListening,
    stopListening,
    processCommand,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
