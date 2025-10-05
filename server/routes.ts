import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { insertUserSchema, insertTransactionSchema, insertBeneficiarySchema } from "@shared/schema";
import { z } from "zod";

// Squad API configuration
const SQUAD_API_KEY = process.env.SQUAD_API_KEY || process.env.SQUAD_SECRET_KEY || "";
const SQUAD_BASE_URL = "https://squadco.com/api/v1";

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

// Session user type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

interface AuthRequest extends Request {
  userId?: string;
}

// Middleware to check authentication
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  req.userId = req.session.userId;
  next();
};

// Squad API helper functions
const squadAPI = {
  async createVirtualAccount(customerData: any) {
    const response = await fetch(`${SQUAD_BASE_URL}/virtual-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUAD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_identifier: customerData.phone.slice(-10), // Last 10 digits
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        mobile_num: customerData.phone,
        email: customerData.email,
        bvn: customerData.bvn || null,
        beneficiary_account: customerData.phone.slice(-10)
      })
    });
    return response.json();
  },

  async getBanks() {
    const response = await fetch(`${SQUAD_BASE_URL}/banks`, {
      headers: {
        'Authorization': `Bearer ${SQUAD_API_KEY}`
      }
    });
    return response.json();
  },

  async verifyAccountNumber(bankCode: string, accountNumber: string) {
    const response = await fetch(`${SQUAD_BASE_URL}/account-lookup?bank_code=${bankCode}&account_number=${accountNumber}`, {
      headers: {
        'Authorization': `Bearer ${SQUAD_API_KEY}`
      }
    });
    return response.json();
  },

  async initiateTransfer(transferData: any) {
    const response = await fetch(`${SQUAD_BASE_URL}/transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUAD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferData)
    });
    return response.json();
  }
};

// Twilio helper function
const sendSMS = async (to: string, message: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log("SMS would be sent:", { to, message });
    return { success: true }; // Mock for development
  }
  
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: message
      })
    });
    return { success: response.ok };
  } catch (error) {
    console.error("SMS sending failed:", error);
    return { success: false };
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email) || 
                           await storage.getUserByPhone(userData.phone);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email or phone" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Create wallet
      await storage.createWallet({
        userId: user.id,
        balance: '0.00',
        ledgerBalance: '0.00'
      });

      // Create virtual account via Squad API
      try {
        const squadResponse = await squadAPI.createVirtualAccount(user);
        if (squadResponse.success) {
          await storage.createVirtualAccount({
            userId: user.id,
            accountNumber: squadResponse.data.account_number,
            accountName: squadResponse.data.account_name,
            bankName: squadResponse.data.bank_name,
            bankCode: squadResponse.data.bank_code,
            squadCustomerId: squadResponse.data.customer_identifier
          });
        }
      } catch (error) {
        console.error("Virtual account creation failed:", error);
      }

      // Generate OTP for phone verification
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await storage.createOtpVerification({
        userId: user.id,
        phone: user.phone,
        code: otpCode,
        type: 'registration',
        expiresAt
      });

      // Send OTP via SMS
      await sendSMS(user.phone, `Your FinXchange verification code is: ${otpCode}`);

      res.status(201).json({
        message: "Registration successful. Please verify your phone number.",
        userId: user.id
      });

    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { code, type, userId } = req.body;

      const otpRecord = await storage.getOtpVerification(code, type);
      if (!otpRecord) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      if (otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      if (otpRecord.userId !== userId) {
        return res.status(400).json({ message: "Invalid OTP for this user" });
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(otpRecord.id);

      // Update user verification status
      if (type === 'registration') {
        await storage.updateUser(userId, {
          isPhoneVerified: true,
          status: 'active'
        });
      }

      // Create session
      req.session.userId = userId;

      res.json({ message: "Verification successful" });

    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.status === 'suspended' || user.status === 'blocked') {
        return res.status(403).json({ message: "Account is suspended or blocked" });
      }

      req.session.userId = user.id;

      const { password: _, ...userWithoutPassword } = user;
      res.json({
        message: "Login successful",
        user: userWithoutPassword
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });

  // Get wallet balance
  app.get("/api/wallet", requireAuth, async (req: AuthRequest, res) => {
    try {
      const wallet = await storage.getWallet(req.userId!);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      res.json(wallet);

    } catch (error) {
      console.error("Get wallet error:", error);
      res.status(500).json({ message: "Failed to get wallet data" });
    }
  });

  // Get virtual account
  app.get("/api/virtual-account", requireAuth, async (req: AuthRequest, res) => {
    try {
      const account = await storage.getVirtualAccount(req.userId!);
      if (!account) {
        return res.status(404).json({ message: "Virtual account not found" });
      }

      res.json(account);

    } catch (error) {
      console.error("Get virtual account error:", error);
      res.status(500).json({ message: "Failed to get virtual account data" });
    }
  });

  // Get banks list
  app.get("/api/banks", requireAuth, async (req, res) => {
    try {
      const banks = await squadAPI.getBanks();
      res.json(banks);

    } catch (error) {
      console.error("Get banks error:", error);
      res.status(500).json({ message: "Failed to get banks list" });
    }
  });

  // Verify account number
  app.post("/api/verify-account", requireAuth, async (req, res) => {
    try {
      const { bankCode, accountNumber } = req.body;
      
      if (!bankCode || !accountNumber) {
        return res.status(400).json({ message: "Bank code and account number are required" });
      }

      const verification = await squadAPI.verifyAccountNumber(bankCode, accountNumber);
      res.json(verification);

    } catch (error) {
      console.error("Account verification error:", error);
      res.status(500).json({ message: "Account verification failed" });
    }
  });

  // Initiate bank transfer
  app.post("/api/transfer/bank", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount, bankCode, accountNumber, accountName, description, pin } = req.body;

      // Verify transaction PIN
      const user = await storage.getUser(req.userId!);
      if (!user || !user.transactionPin) {
        return res.status(400).json({ message: "Transaction PIN not set" });
      }

      const isValidPin = await bcrypt.compare(pin, user.transactionPin);
      if (!isValidPin) {
        return res.status(401).json({ message: "Invalid transaction PIN" });
      }

      // Check wallet balance
      const wallet = await storage.getWallet(req.userId!);
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const walletBalance = wallet.balance ? parseFloat(wallet.balance) : 0;
      if (walletBalance < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Generate transaction reference
      const reference = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: req.userId!,
        type: 'bank_transfer',
        amount,
        description: description || `Transfer to ${accountName}`,
        reference,
        recipientDetails: {
          bankCode,
          accountNumber,
          accountName
        }
      });

      // Initiate Squad transfer
      try {
        const transferData = {
          amount: parseFloat(amount) * 100, // Convert to kobo
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          currency_id: "NGN",
          transaction_reference: reference,
          callback_url: `${process.env.BASE_URL || 'http://localhost:5000'}/api/webhooks/squad`,
          email: user.email
        };

        const squadResponse = await squadAPI.initiateTransfer(transferData);

        if (squadResponse.success) {
          // Update transaction with Squad reference
          await storage.updateTransaction(transaction.id, {
            squadReference: squadResponse.data.transaction_reference,
            status: 'pending'
          });

          // Deduct from wallet (will be reversed if transfer fails)
          const currentBalance = wallet.balance ? parseFloat(wallet.balance) : 0;
          const newBalance = (currentBalance - parseFloat(amount)).toString();
          await storage.updateWalletBalance(req.userId!, newBalance);

          res.json({
            message: "Transfer initiated successfully",
            transaction: {
              id: transaction.id,
              reference,
              status: 'pending'
            }
          });
        } else {
          // Update transaction status to failed
          await storage.updateTransaction(transaction.id, { status: 'failed' });
          res.status(400).json({ message: squadResponse.message || "Transfer failed" });
        }

      } catch (error) {
        // Update transaction status to failed
        await storage.updateTransaction(transaction.id, { status: 'failed' });
        throw error;
      }

    } catch (error) {
      console.error("Bank transfer error:", error);
      res.status(500).json({ message: "Transfer failed" });
    }
  });

  // Wallet to wallet transfer
  app.post("/api/transfer/wallet", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount, recipientPhone, description, pin } = req.body;

      // Verify transaction PIN
      const user = await storage.getUser(req.userId!);
      if (!user || !user.transactionPin) {
        return res.status(400).json({ message: "Transaction PIN not set" });
      }

      const isValidPin = await bcrypt.compare(pin, user.transactionPin);
      if (!isValidPin) {
        return res.status(401).json({ message: "Invalid transaction PIN" });
      }

      // Find recipient
      const recipient = await storage.getUserByPhone(recipientPhone);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      // Check sender balance
      const senderWallet = await storage.getWallet(req.userId!);
      if (!senderWallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      const senderBalance = senderWallet.balance ? parseFloat(senderWallet.balance) : 0;
      if (senderBalance < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Get recipient wallet
      const recipientWallet = await storage.getWallet(recipient.id);
      if (!recipientWallet) {
        return res.status(404).json({ message: "Recipient wallet not found" });
      }

      // Generate transaction reference
      const reference = `WTW_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Create sender transaction
      const senderTransaction = await storage.createTransaction({
        userId: req.userId!,
        type: 'wallet_transfer',
        amount: `-${amount}`,
        description: description || `Transfer to ${recipient.firstName} ${recipient.lastName}`,
        reference,
        status: 'success',
        recipientDetails: {
          recipientId: recipient.id,
          recipientName: `${recipient.firstName} ${recipient.lastName}`,
          recipientPhone
        }
      });

      // Create recipient transaction
      await storage.createTransaction({
        userId: recipient.id,
        type: 'wallet_transfer',
        amount,
        description: `Received from ${user.firstName} ${user.lastName}`,
        reference: `RCV_${reference}`,
        status: 'success',
        recipientDetails: {
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          senderPhone: user.phone
        }
      });

      // Update wallets
      const currentSenderBalance = senderWallet.balance ? parseFloat(senderWallet.balance) : 0;
      const currentRecipientBalance = recipientWallet.balance ? parseFloat(recipientWallet.balance) : 0;
      const newSenderBalance = (currentSenderBalance - parseFloat(amount)).toString();
      const newRecipientBalance = (currentRecipientBalance + parseFloat(amount)).toString();

      await storage.updateWalletBalance(req.userId!, newSenderBalance);
      await storage.updateWalletBalance(recipient.id, newRecipientBalance);

      res.json({
        message: "Transfer successful",
        transaction: {
          id: senderTransaction.id,
          reference,
          status: 'success'
        }
      });

    } catch (error) {
      console.error("Wallet transfer error:", error);
      res.status(500).json({ message: "Transfer failed" });
    }
  });

  // Get transactions
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getTransactions(req.userId!, limit);
      res.json(transactions);

    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  // Get beneficiaries
  app.get("/api/beneficiaries", requireAuth, async (req: AuthRequest, res) => {
    try {
      const beneficiaries = await storage.getBeneficiaries(req.userId!);
      res.json(beneficiaries);

    } catch (error) {
      console.error("Get beneficiaries error:", error);
      res.status(500).json({ message: "Failed to get beneficiaries" });
    }
  });

  // Add beneficiary
  app.post("/api/beneficiaries", requireAuth, async (req: AuthRequest, res) => {
    try {
      const beneficiaryData = insertBeneficiarySchema.parse({
        ...req.body,
        userId: req.userId
      });

      const beneficiary = await storage.createBeneficiary(beneficiaryData);
      res.status(201).json(beneficiary);

    } catch (error) {
      console.error("Add beneficiary error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add beneficiary" });
    }
  });

  // Squad webhook for transaction updates
  app.post("/api/webhooks/squad", async (req, res) => {
    try {
      const { transaction_reference, transaction_status } = req.body;

      // Find transaction by Squad reference
      const transactions = await storage.getTransactions("", 1000); // Get all recent transactions
      const transaction = transactions.find(t => t.squadReference === transaction_reference);

      if (transaction) {
        let status: 'pending' | 'success' | 'failed';
        
        if (transaction_status === 'success') {
          status = 'success';
        } else if (transaction_status === 'failed') {
          status = 'failed';
          // Refund wallet if transfer failed
          const wallet = await storage.getWallet(transaction.userId);
          if (wallet && wallet.balance) {
            const currentBalance = parseFloat(wallet.balance);
            const refundAmount = (currentBalance + parseFloat(transaction.amount.replace('-', ''))).toString();
            await storage.updateWalletBalance(transaction.userId, refundAmount);
          }
        } else {
          status = 'pending';
        }

        await storage.updateTransaction(transaction.id, { status });
      }

      res.json({ message: "Webhook processed" });

    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Set transaction PIN
  app.post("/api/auth/set-pin", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { pin } = req.body;

      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4 digits" });
      }

      const hashedPin = await bcrypt.hash(pin, 12);
      await storage.updateUser(req.userId!, { transactionPin: hashedPin });

      res.json({ message: "Transaction PIN set successfully" });

    } catch (error) {
      console.error("Set PIN error:", error);
      res.status(500).json({ message: "Failed to set PIN" });
    }
  });

  // Offline transactions queue
  app.get("/api/offline-transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const offlineTransactions = await storage.getOfflineTransactions(req.userId!);
      res.json(offlineTransactions);

    } catch (error) {
      console.error("Get offline transactions error:", error);
      res.status(500).json({ message: "Failed to get offline transactions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
