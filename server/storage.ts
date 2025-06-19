import { 
  users, 
  testResults, 
  payments,
  adminConfigs,
  type User, 
  type InsertUser, 
  type TestResult, 
  type InsertTestResult,
  type Payment,
  type InsertPayment 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;
  checkUserTestLimits(userId: number): Promise<{ canTakeTest: boolean; reason?: string; testsRemaining?: number }>;
  consumeUserTest(userId: number): Promise<void>;
  grantPremiumAccess(userId: number, testsCount?: number): Promise<void>;

  // Test result operations
  createTestResult(testResult: InsertTestResult): Promise<TestResult>;
  getTestResult(id: number): Promise<TestResult | undefined>;
  getTestResultsByUser(userId: number): Promise<TestResult[]>;
  getTestResultsByEmail(email: string): Promise<TestResult[]>;
  getTestResultByGuest(email: string): Promise<TestResult | undefined>;
  getTestResultByWhatsApp(whatsapp: string): Promise<TestResult | undefined>;
  getTestResultsByName(name: string): Promise<TestResult[]>;
  updateTestResultPremium(id: number, paymentId: string): Promise<TestResult>;
  associateGuestTestsWithUser(email: string, userId: number): Promise<void>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByIntentId(intentId: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: number, status: string): Promise<Payment>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkUserTestLimits(userId: number): Promise<{ canTakeTest: boolean; reason?: string; testsRemaining?: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { canTakeTest: false, reason: "Usuário não encontrado" };
    }

    // Count total tests taken by user
    const userTests = await db.select().from(testResults).where(eq(testResults.userId, userId));
    const totalTests = userTests.length;

    // Check if user has any premium test (is_premium = true)
    const premiumTests = userTests.filter(test => test.isPremium);
    const hasPremiumTest = premiumTests.length > 0;

    // If user has premium access
    if (hasPremiumTest) {
      // Premium users can take up to 3 tests total (1 free + 2 premium)
      const maxTestsForPremium = 3;
      const remainingTests = maxTestsForPremium - totalTests;
      
      if (remainingTests > 0) {
        return { 
          canTakeTest: true, 
          testsRemaining: remainingTests
        };
      } else {
        return { 
          canTakeTest: false, 
          reason: "Você atingiu o limite de testes premium (máximo 3 testes: 1 gratuito + 2 premium)." 
        };
      }
    }

    // If user never took a test (free test available)
    if (totalTests === 0) {
      return { 
        canTakeTest: true, 
        testsRemaining: 1 
      };
    }

    // If user already used free test and doesn't have premium
    return { 
      canTakeTest: false, 
      reason: "Você já utilizou seu teste gratuito. Faça upgrade para premium para ter acesso a 2 testes adicionais." 
    };
  }

  async consumeUserTest(userId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const userTests = await db.select().from(testResults).where(eq(testResults.userId, userId));
    const totalTests = userTests.length;

    // Only mark free test as used if this is the first test
    if (totalTests === 0) {
      await db
        .update(users)
        .set({ freeTestsUsed: 1 })
        .where(eq(users.id, userId));
    }
    
    // For premium users, no need to decrement anything as they have unlimited tests
  }

  async grantPremiumAccess(userId: number, testsCount: number = 2): Promise<void> {
    await db
      .update(users)
      .set({ 
        isPremiumActive: true,
        premiumTestsRemaining: testsCount // Limited to 2 additional tests for premium users
      })
      .where(eq(users.id, userId));
  }

  // Test result operations
  async createTestResult(testResult: InsertTestResult): Promise<TestResult> {
    const [result] = await db
      .insert(testResults)
      .values(testResult)
      .returning();
    return result;
  }

  async getTestResult(id: number): Promise<TestResult | undefined> {
    const [result] = await db.select().from(testResults).where(eq(testResults.id, id));
    return result || undefined;
  }

  async getTestResultsByUser(userId: number): Promise<TestResult[]> {
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.createdAt));
  }

  async getTestResultsByEmail(email: string): Promise<TestResult[]> {
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.guestEmail, email))
      .orderBy(desc(testResults.createdAt));
  }

  async associateGuestTestsWithUser(email: string, userId: number): Promise<void> {
    await db
      .update(testResults)
      .set({ userId: userId })
      .where(eq(testResults.guestEmail, email));
  }

  async getTestResultByGuest(email: string): Promise<TestResult | undefined> {
    const [result] = await db
      .select()
      .from(testResults)
      .where(eq(testResults.guestEmail, email))
      .orderBy(desc(testResults.createdAt));
    return result || undefined;
  }

  async getTestResultByWhatsApp(whatsapp: string): Promise<TestResult | undefined> {
    // Clean the WhatsApp number - remove spaces, dashes, parentheses
    const cleanWhatsapp = whatsapp.replace(/[\s\-\(\)\+]/g, '');
    
    const [result] = await db
      .select()
      .from(testResults)
      .where(sql`REPLACE(REPLACE(REPLACE(REPLACE(${testResults.guestWhatsapp}, ' ', ''), '-', ''), '(', ''), ')', '') = ${cleanWhatsapp}`)
      .orderBy(desc(testResults.createdAt));
    return result || undefined;
  }

  async getTestResultsByName(name: string): Promise<TestResult[]> {
    const results = await db
      .select()
      .from(testResults)
      .where(eq(testResults.guestName, name))
      .orderBy(desc(testResults.createdAt));
    return results;
  }

  async updateTestResultPremium(id: number, paymentId: string): Promise<TestResult> {
    const [result] = await db
      .update(testResults)
      .set({ 
        isPremium: true,
        paymentId: paymentId 
      })
      .where(eq(testResults.id, id))
      .returning();
    return result;
  }



  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return result;
  }

  async getPaymentByIntentId(intentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, intentId));
    return payment || undefined;
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ status })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Admin config operations
  async getAdminConfig(key: string): Promise<string | null> {
    const [config] = await db.select().from(adminConfigs).where(eq(adminConfigs.key, key));
    return config?.value || null;
  }

  async setAdminConfig(key: string, value: string): Promise<void> {
    await db
      .insert(adminConfigs)
      .values({ key, value })
      .onConflictDoUpdate({
        target: adminConfigs.key,
        set: { value, updatedAt: new Date() }
      });
  }

  async getAllAdminConfigs(): Promise<Record<string, string>> {
    const configs = await db.select().from(adminConfigs);
    return configs.reduce((acc, config) => {
      acc[config.key] = config.value || '';
      return acc;
    }, {} as Record<string, string>);
  }
}

export const storage = new DatabaseStorage();