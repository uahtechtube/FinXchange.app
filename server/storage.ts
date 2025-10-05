import { 
  users, wallets, virtualAccounts, transactions, beneficiaries, 
  kycDocuments, otpVerifications, offlineTransactions,
  type User, type InsertUser, type Wallet, type InsertWallet,
  type VirtualAccount, type InsertVirtualAccount, type Transaction, 
  type InsertTransaction, type Beneficiary, type InsertBeneficiary,
  type KycDocument, type InsertKycDocument, type OtpVerification,
  type InsertOtpVerification, type OfflineTransaction, type InsertOfflineTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Wallet operations
  getWallet(userId: string): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: string, balance: string): Promise<Wallet | undefined>;

  // Virtual Account operations
  getVirtualAccount(userId: string): Promise<VirtualAccount | undefined>;
  getVirtualAccountByNumber(accountNumber: string): Promise<VirtualAccount | undefined>;
  createVirtualAccount(account: InsertVirtualAccount): Promise<VirtualAccount>;
  updateVirtualAccount(id: string, updates: Partial<InsertVirtualAccount>): Promise<VirtualAccount | undefined>;

  // Transaction operations
  getTransactions(userId: string, limit?: number): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined>;

  // Beneficiary operations
  getBeneficiaries(userId: string): Promise<Beneficiary[]>;
  getBeneficiary(id: string): Promise<Beneficiary | undefined>;
  createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary>;
  updateBeneficiary(id: string, updates: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined>;
  deleteBeneficiary(id: string): Promise<boolean>;

  // KYC operations
  getKycDocuments(userId: string): Promise<KycDocument | undefined>;
  createKycDocuments(kyc: InsertKycDocument): Promise<KycDocument>;
  updateKycDocuments(userId: string, updates: Partial<InsertKycDocument>): Promise<KycDocument | undefined>;

  // OTP operations
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getOtpVerification(code: string, type: string): Promise<OtpVerification | undefined>;
  markOtpAsUsed(id: string): Promise<boolean>;
  incrementOtpAttempts(id: string): Promise<boolean>;

  // Offline transaction operations
  getOfflineTransactions(userId: string): Promise<OfflineTransaction[]>;
  createOfflineTransaction(transaction: InsertOfflineTransaction): Promise<OfflineTransaction>;
  markOfflineTransactionProcessed(id: string): Promise<boolean>;
  getPendingOfflineTransactions(): Promise<OfflineTransaction[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db
      .insert(wallets)
      .values(insertWallet)
      .returning();
    return wallet;
  }

  async updateWalletBalance(userId: string, balance: string): Promise<Wallet | undefined> {
    const [wallet] = await db
      .update(wallets)
      .set({ balance, updatedAt: sql`now()` })
      .where(eq(wallets.userId, userId))
      .returning();
    return wallet || undefined;
  }

  async getVirtualAccount(userId: string): Promise<VirtualAccount | undefined> {
    const [account] = await db.select().from(virtualAccounts).where(eq(virtualAccounts.userId, userId));
    return account || undefined;
  }

  async getVirtualAccountByNumber(accountNumber: string): Promise<VirtualAccount | undefined> {
    const [account] = await db.select().from(virtualAccounts).where(eq(virtualAccounts.accountNumber, accountNumber));
    return account || undefined;
  }

  async createVirtualAccount(insertAccount: InsertVirtualAccount): Promise<VirtualAccount> {
    const [account] = await db
      .insert(virtualAccounts)
      .values(insertAccount)
      .returning();
    return account;
  }

  async updateVirtualAccount(id: string, updates: Partial<InsertVirtualAccount>): Promise<VirtualAccount | undefined> {
    const [account] = await db
      .update(virtualAccounts)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(virtualAccounts.id, id))
      .returning();
    return account || undefined;
  }

  async getTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async getBeneficiaries(userId: string): Promise<Beneficiary[]> {
    return await db
      .select()
      .from(beneficiaries)
      .where(and(eq(beneficiaries.userId, userId), eq(beneficiaries.isActive, true)))
      .orderBy(desc(beneficiaries.createdAt));
  }

  async getBeneficiary(id: string): Promise<Beneficiary | undefined> {
    const [beneficiary] = await db.select().from(beneficiaries).where(eq(beneficiaries.id, id));
    return beneficiary || undefined;
  }

  async createBeneficiary(insertBeneficiary: InsertBeneficiary): Promise<Beneficiary> {
    const [beneficiary] = await db
      .insert(beneficiaries)
      .values(insertBeneficiary)
      .returning();
    return beneficiary;
  }

  async updateBeneficiary(id: string, updates: Partial<InsertBeneficiary>): Promise<Beneficiary | undefined> {
    const [beneficiary] = await db
      .update(beneficiaries)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(beneficiaries.id, id))
      .returning();
    return beneficiary || undefined;
  }

  async deleteBeneficiary(id: string): Promise<boolean> {
    const [beneficiary] = await db
      .update(beneficiaries)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(eq(beneficiaries.id, id))
      .returning();
    return !!beneficiary;
  }

  async getKycDocuments(userId: string): Promise<KycDocument | undefined> {
    const [kyc] = await db.select().from(kycDocuments).where(eq(kycDocuments.userId, userId));
    return kyc || undefined;
  }

  async createKycDocuments(insertKyc: InsertKycDocument): Promise<KycDocument> {
    const [kyc] = await db
      .insert(kycDocuments)
      .values(insertKyc)
      .returning();
    return kyc;
  }

  async updateKycDocuments(userId: string, updates: Partial<InsertKycDocument>): Promise<KycDocument | undefined> {
    const [kyc] = await db
      .update(kycDocuments)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(kycDocuments.userId, userId))
      .returning();
    return kyc || undefined;
  }

  async createOtpVerification(insertOtp: InsertOtpVerification): Promise<OtpVerification> {
    const [otp] = await db
      .insert(otpVerifications)
      .values(insertOtp)
      .returning();
    return otp;
  }

  async getOtpVerification(code: string, type: string): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(and(
        eq(otpVerifications.code, code),
        eq(otpVerifications.type, type),
        eq(otpVerifications.isUsed, false)
      ));
    return otp || undefined;
  }

  async markOtpAsUsed(id: string): Promise<boolean> {
    const [otp] = await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, id))
      .returning();
    return !!otp;
  }

  async incrementOtpAttempts(id: string): Promise<boolean> {
    const [otp] = await db
      .update(otpVerifications)
      .set({ attempts: sql`attempts + 1` })
      .where(eq(otpVerifications.id, id))
      .returning();
    return !!otp;
  }

  async getOfflineTransactions(userId: string): Promise<OfflineTransaction[]> {
    return await db
      .select()
      .from(offlineTransactions)
      .where(and(
        eq(offlineTransactions.userId, userId),
        eq(offlineTransactions.isProcessed, false)
      ))
      .orderBy(desc(offlineTransactions.createdAt));
  }

  async createOfflineTransaction(insertOfflineTransaction: InsertOfflineTransaction): Promise<OfflineTransaction> {
    const [transaction] = await db
      .insert(offlineTransactions)
      .values(insertOfflineTransaction)
      .returning();
    return transaction;
  }

  async markOfflineTransactionProcessed(id: string): Promise<boolean> {
    const [transaction] = await db
      .update(offlineTransactions)
      .set({ isProcessed: true, processedAt: sql`now()` })
      .where(eq(offlineTransactions.id, id))
      .returning();
    return !!transaction;
  }

  async getPendingOfflineTransactions(): Promise<OfflineTransaction[]> {
    return await db
      .select()
      .from(offlineTransactions)
      .where(eq(offlineTransactions.isProcessed, false))
      .orderBy(offlineTransactions.createdAt);
  }
}

export const storage = new DatabaseStorage();
