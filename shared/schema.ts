import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  decimal, 
  timestamp, 
  boolean, 
  integer,
  pgEnum,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'suspended', 'blocked']);
export const kycStatusEnum = pgEnum('kyc_status', ['pending', 'verified', 'rejected']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'wallet_transfer', 'bank_transfer', 'deposit', 'withdrawal', 'airtime', 'data', 
  'electricity', 'cable_tv', 'internet', 'loan_repayment'
]);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'success', 'failed', 'cancelled']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  status: userStatusEnum("status").default('pending'),
  kycStatus: kycStatusEnum("kyc_status").default('pending'),
  transactionPin: varchar("transaction_pin", { length: 255 }),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// KYC Documents
export const kycDocuments = pgTable("kyc_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bvn: varchar("bvn", { length: 11 }),
  nin: varchar("nin", { length: 11 }),
  proofOfAddress: text("proof_of_address"), // URL to document
  bvnVerified: boolean("bvn_verified").default(false),
  ninVerified: boolean("nin_verified").default(false),
  addressVerified: boolean("address_verified").default(false),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Virtual Accounts
export const virtualAccounts = pgTable("virtual_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountNumber: varchar("account_number", { length: 10 }).notNull().unique(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankCode: varchar("bank_code", { length: 10 }).notNull(),
  squadCustomerId: varchar("squad_customer_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Wallets
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).default('0.00'),
  ledgerBalance: decimal("ledger_balance", { precision: 12, scale: 2 }).default('0.00'),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 12, scale: 2 }).default('0.00'),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  status: transactionStatusEnum("status").default('pending'),
  recipientDetails: jsonb("recipient_details"), // For bank transfers, beneficiary info
  metadata: jsonb("metadata"), // Additional transaction data
  squadReference: varchar("squad_reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Beneficiaries
export const beneficiaries = pgTable("beneficiaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountNumber: varchar("account_number", { length: 10 }).notNull(),
  accountName: varchar("account_name", { length: 255 }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankCode: varchar("bank_code", { length: 10 }).notNull(),
  nickname: varchar("nickname", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// OTP Verifications
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'registration', 'login', 'transaction'
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Offline Transaction Queue
export const offlineTransactions = pgTable("offline_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  recipientDetails: jsonb("recipient_details"),
  metadata: jsonb("metadata"),
  isProcessed: boolean("is_processed").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  kycDocuments: one(kycDocuments, {
    fields: [users.id],
    references: [kycDocuments.userId]
  }),
  virtualAccount: one(virtualAccounts, {
    fields: [users.id],
    references: [virtualAccounts.userId]
  }),
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId]
  }),
  transactions: many(transactions),
  beneficiaries: many(beneficiaries),
  offlineTransactions: many(offlineTransactions)
}));

export const virtualAccountsRelations = relations(virtualAccounts, ({ one }) => ({
  user: one(users, {
    fields: [virtualAccounts.userId],
    references: [users.id]
  })
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id]
  })
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id]
  })
}));

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  user: one(users, {
    fields: [beneficiaries.userId],
    references: [users.id]
  })
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, {
    fields: [kycDocuments.userId],
    references: [users.id]
  })
}));

export const offlineTransactionsRelations = relations(offlineTransactions, ({ one }) => ({
  user: one(users, {
    fields: [offlineTransactions.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertKycDocumentsSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVirtualAccountSchema = createInsertSchema(virtualAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true
});

export const insertOfflineTransactionSchema = createInsertSchema(offlineTransactions).omit({
  id: true,
  createdAt: true
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentsSchema>;
export type VirtualAccount = typeof virtualAccounts.$inferSelect;
export type InsertVirtualAccount = z.infer<typeof insertVirtualAccountSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type OfflineTransaction = typeof offlineTransactions.$inferSelect;
export type InsertOfflineTransaction = z.infer<typeof insertOfflineTransactionSchema>;
