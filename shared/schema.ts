import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  whatsapp: text("whatsapp").notNull(),
  password: text("password"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testResults = pgTable("test_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  guestEmail: text("guest_email"),
  guestName: text("guest_name"),
  guestWhatsapp: text("guest_whatsapp"),
  testType: text("test_type").notNull(), // 'DISC' or 'PPA'
  answers: jsonb("answers").notNull(), // Array of answer objects
  scores: jsonb("scores").notNull(), // DISC scores object
  profileType: text("profile_type").notNull(),
  isPremium: boolean("is_premium").default(false),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  testResultId: integer("test_result_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").default("brl"),
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  testResults: many(testResults),
}));

export const testResultsRelations = relations(testResults, ({ one, many }) => ({
  user: one(users, {
    fields: [testResults.userId],
    references: [users.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  testResult: one(testResults, {
    fields: [payments.testResultId],
    references: [testResults.id],
  }),
}));

// Admin configurations table
export const adminConfigs = pgTable("admin_configs", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).unique().notNull(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  content: text("content").notNull(),
  variables: text("variables").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
});

export const insertTestResultSchema = createInsertSchema(testResults).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

// Guest test data schema for initial submission
export const guestTestDataSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().min(10, "WhatsApp deve ter pelo menos 10 dígitos"),
});

// DISC answer schema
export const discAnswerSchema = z.object({
  questionId: z.number(),
  most: z.string(),
  least: z.string(),
});

export const discTestSubmissionSchema = z.object({
  guestData: guestTestDataSchema,
  answers: z.array(discAnswerSchema),
});

// User test submission schema (for authenticated users)
export const userTestSubmissionSchema = z.object({
  userId: z.number(),
  answers: z.array(discAnswerSchema),
});

// Registration schema
export const registrationSchema = insertUserSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TestResult = typeof testResults.$inferSelect;
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type GuestTestData = z.infer<typeof guestTestDataSchema>;
export type DiscAnswer = z.infer<typeof discAnswerSchema>;
export type DiscTestSubmission = z.infer<typeof discTestSubmissionSchema>;
export type UserTestSubmission = z.infer<typeof userTestSubmissionSchema>;
export type Registration = z.infer<typeof registrationSchema>;
