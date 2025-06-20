import { IStorage } from "./storage";
import { User, InsertUser, TestResult, InsertTestResult, Payment, InsertPayment } from "@shared/schema";

// Temporary in-memory storage to handle Neon database outages
class MemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private usersByEmail: Map<string, User> = new Map();
  private testResults: Map<number, TestResult> = new Map();
  private payments: Map<number, Payment> = new Map();
  private userCounter = 1;
  private testCounter = 1;
  private paymentCounter = 1;

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.clerkId === clerkId) return user;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.userCounter++,
      clerkId: insertUser.clerkId || null,
      email: insertUser.email,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      whatsapp: insertUser.whatsapp || null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      freeTestsUsed: 0,
      premiumTestsRemaining: null,
      isPremiumActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async updateUserStripeInfo(userId: number, customerId: string, subscriptionId?: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");

    user.stripeCustomerId = customerId;
    user.stripeSubscriptionId = subscriptionId || null;
    user.updatedAt = new Date();

    this.users.set(userId, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async checkUserTestLimits(userId: number): Promise<{ canTakeTest: boolean; reason?: string; testsRemaining?: number }> {
    const user = this.users.get(userId);
    if (!user) {
      return { canTakeTest: false, reason: "Usuário não encontrado" };
    }

    // For memory storage, allow unlimited tests during database outage
    return { canTakeTest: true, testsRemaining: -1 };
  }

  async consumeUserTest(userId: number): Promise<void> {
    // No-op for memory storage during outage
  }

  async grantPremiumAccess(userId: number, testsCount: number = 2): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isPremiumActive = true;
      user.premiumTestsRemaining = testsCount;
      user.updatedAt = new Date();
      this.users.set(userId, user);
      this.usersByEmail.set(user.email, user);
    }
  }

  // Test result operations
  async createTestResult(testResult: InsertTestResult): Promise<TestResult> {
    const result: TestResult = {
      id: this.testCounter++,
      userId: testResult.userId || null,
      testType: testResult.testType,
      profileType: testResult.profileType,
      scores: testResult.scores,
      interpretation: testResult.interpretation || null,
      guestName: testResult.guestName || null,
      guestEmail: testResult.guestEmail || null,
      guestWhatsapp: testResult.guestWhatsapp || null,
      isPremium: false,
      premiumPaymentId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.testResults.set(result.id, result);
    return result;
  }

  async getTestResult(id: number): Promise<TestResult | undefined> {
    return this.testResults.get(id);
  }

  async getTestResultsByUser(userId: number): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .filter(result => result.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTestResultsByEmail(email: string): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .filter(result => result.guestEmail === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getTestResultByGuest(email: string): Promise<TestResult | undefined> {
    return Array.from(this.testResults.values())
      .find(result => result.guestEmail === email);
  }

  async getTestResultByWhatsApp(whatsapp: string): Promise<TestResult | undefined> {
    const cleanWhatsapp = whatsapp.replace(/[\s\-\(\)\+]/g, '');
    return Array.from(this.testResults.values())
      .find(result => result.guestWhatsapp?.replace(/[\s\-\(\)\+]/g, '') === cleanWhatsapp);
  }

  async getTestResultsByName(name: string): Promise<TestResult[]> {
    return Array.from(this.testResults.values())
      .filter(result => result.guestName?.toLowerCase().includes(name.toLowerCase()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTestResultPremium(id: number, paymentId: string): Promise<TestResult> {
    const result = this.testResults.get(id);
    if (!result) throw new Error("Test result not found");

    result.isPremium = true;
    result.premiumPaymentId = paymentId;
    result.updatedAt = new Date();

    this.testResults.set(id, result);
    return result;
  }

  async associateGuestTestsWithUser(email: string, userId: number): Promise<void> {
    for (const result of this.testResults.values()) {
      if (result.guestEmail === email) {
        result.userId = userId;
        result.updatedAt = new Date();
        this.testResults.set(result.id, result);
      }
    }
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment: Payment = {
      id: this.paymentCounter++,
      testResultId: payment.testResultId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.payments.set(newPayment.id, newPayment);
    return newPayment;
  }

  async getPaymentByIntentId(intentId: string): Promise<Payment | undefined> {
    return Array.from(this.payments.values())
      .find(payment => payment.stripePaymentIntentId === intentId);
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment> {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("Payment not found");

    payment.status = status;
    payment.updatedAt = new Date();

    this.payments.set(id, payment);
    return payment;
  }

  async getAdminConfig(key: string): Promise<string | null> {
    const defaults: Record<string, string> = {
      regularPrice: '97',
      promocionalPrice: '47',
      isPromotionActive: 'true'
    };
    return defaults[key] || null;
  }

  async setAdminConfig(key: string, value: string): Promise<void> {
    // No-op for memory storage
  }

  async getAllAdminConfigs(): Promise<Record<string, string>> {
    return {
      regularPrice: '97',
      promocionalPrice: '47',
      isPromotionActive: 'true'
    };
  }
}

export const memoryStorage = new MemoryStorage();