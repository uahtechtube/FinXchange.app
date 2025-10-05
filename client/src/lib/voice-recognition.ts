// Voice recognition utilities for FinXchange banking app
export interface VoiceCommand {
  type: 'balance' | 'send' | 'airtime' | 'data' | 'electricity' | 'transactions' | 'help' | 'unknown';
  confidence: number;
  params?: {
    amount?: number;
    recipient?: string;
    service?: string;
    phone?: string;
  };
}

export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  command: VoiceCommand;
}

class VoiceRecognitionService {
  private recognition: any = null;
  private isInitialized = false;
  private isListening = false;

  constructor() {
    this.initialize();
  }

  private initialize(): boolean {
    if (!this.isSupported()) {
      console.warn('Speech Recognition is not supported in this browser');
      return false;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition settings
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;
    }

    this.isInitialized = true;
    return true;
  }

  isSupported(): boolean {
    return 'SpeechRecognition' in (window as any) || 'webkitSpeechRecognition' in (window as any);
  }

  async startListening(): Promise<VoiceRecognitionResult> {
    if (!this.isInitialized || !this.recognition) {
      throw new Error('Voice recognition not initialized');
    }

    if (this.isListening) {
      throw new Error('Already listening');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Recognition not available'));
        return;
      }

      const timeout = setTimeout(() => {
        this.stopListening();
        reject(new Error('Voice recognition timeout'));
      }, 10000); // 10 second timeout

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Voice recognition started');
      };

      this.recognition.onresult = (event: any) => {
        clearTimeout(timeout);
        this.isListening = false;

        const result = event.results[0];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;

        const command = this.parseCommand(transcript, confidence);
        
        resolve({
          transcript,
          confidence,
          command,
        });
      };

      this.recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        this.isListening = false;
        
        let errorMessage = 'Voice recognition error';
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error occurred during voice recognition';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please grant permission and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          default:
            errorMessage = `Voice recognition error: ${event.error}`;
        }
        
        reject(new Error(errorMessage));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error('Failed to start voice recognition'));
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  private parseCommand(transcript: string, confidence: number): VoiceCommand {
    const lowerText = transcript.toLowerCase();
    
    // Balance check patterns
    if (this.matchesPattern(lowerText, ['balance', 'check balance', 'show balance', 'what is my balance', 'current balance'])) {
      return {
        type: 'balance',
        confidence,
      };
    }

    // Send money patterns
    const sendMatch = lowerText.match(/(?:send|transfer)\s+(?:₦?(\d+(?:[,.]?\d+)*)|(\d+(?:[,.]?\d+)*)\s*(?:naira|₦))\s*(?:to\s+(.+?))?(?:\s|$)/i);
    if (sendMatch) {
      const amount = parseFloat((sendMatch[1] || sendMatch[2] || '0').replace(/[,]/g, ''));
      const recipient = sendMatch[3]?.trim();
      
      return {
        type: 'send',
        confidence,
        params: {
          amount,
          recipient,
        },
      };
    }

    // Airtime purchase patterns
    const airtimeMatch = lowerText.match(/(?:buy|purchase|get|top\s*up)?\s*airtime\s*(?:for|of)?\s*(?:₦?(\d+(?:[,.]?\d+)*)|(\d+(?:[,.]?\d+)*)\s*(?:naira|₦))?(?:\s*(?:for|on)\s*(.+?))?(?:\s|$)/i);
    if (lowerText.includes('airtime') && airtimeMatch) {
      const amount = parseFloat((airtimeMatch[1] || airtimeMatch[2] || '0').replace(/[,]/g, ''));
      const phone = airtimeMatch[3]?.trim();
      
      return {
        type: 'airtime',
        confidence,
        params: {
          amount: amount > 0 ? amount : undefined,
          phone,
        },
      };
    }

    // Data purchase patterns
    const dataMatch = lowerText.match(/(?:buy|purchase|get)?\s*data\s*(?:bundle|plan)?\s*(?:for|of)?\s*(?:₦?(\d+(?:[,.]?\d+)*)|(\d+(?:[,.]?\d+)*)\s*(?:naira|₦))?(?:\s*(?:for|on)\s*(.+?))?(?:\s|$)/i);
    if (lowerText.includes('data') && dataMatch) {
      const amount = parseFloat((dataMatch[1] || dataMatch[2] || '0').replace(/[,]/g, ''));
      const phone = dataMatch[3]?.trim();
      
      return {
        type: 'data',
        confidence,
        params: {
          amount: amount > 0 ? amount : undefined,
          phone,
        },
      };
    }

    // Electricity bill patterns
    if (this.matchesPattern(lowerText, ['electricity', 'electric bill', 'power bill', 'nepa', 'phcn', 'light bill'])) {
      const amountMatch = lowerText.match(/(?:₦?(\d+(?:[,.]?\d+)*)|(\d+(?:[,.]?\d+)*)\s*(?:naira|₦))/i);
      const amount = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/[,]/g, '')) : undefined;
      
      return {
        type: 'electricity',
        confidence,
        params: {
          amount,
        },
      };
    }

    // Transaction history patterns
    if (this.matchesPattern(lowerText, ['transactions', 'transaction history', 'recent transactions', 'show transactions', 'my transactions'])) {
      return {
        type: 'transactions',
        confidence,
      };
    }

    // Help patterns
    if (this.matchesPattern(lowerText, ['help', 'what can you do', 'commands', 'assistance', 'support'])) {
      return {
        type: 'help',
        confidence,
      };
    }

    // Unknown command
    return {
      type: 'unknown',
      confidence,
    };
  }

  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => 
      text.includes(pattern) || 
      new RegExp(`\\b${pattern.replace(/\s+/g, '\\s+')}\\b`).test(text)
    );
  }

  getAvailableCommands(): string[] {
    return [
      "Check my balance",
      "Send 5000 naira to John",
      "Buy airtime for 1000 naira",
      "Purchase data for 2000",
      "Pay electricity bill",
      "Show my transactions",
      "What can you do?",
    ];
  }

  // Text-to-speech for feedback
  speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Text-to-speech not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = 'en-US';

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  cancelSpeech(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

// Global instance
export const voiceRecognition = new VoiceRecognitionService();

export default VoiceRecognitionService;
