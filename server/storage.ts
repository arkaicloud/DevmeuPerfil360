import { 
  users, 
  testResults, 
  payments,
  type User, 
  type InsertUser, 
  type TestResult, 
  type InsertTestResult,
  type Payment,
  type InsertPayment 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User>;

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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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

  async updateUserPassword(userId: number, hashedPassword: string) {
    const [result] = await db
      .update(users)
      .set({ 
        password: hashedPassword
      })
      .where(eq(users.id, userId))
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
}

export const storage = new DatabaseStorage();