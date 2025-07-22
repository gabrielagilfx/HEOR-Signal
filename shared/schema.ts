import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  assistantId: text("assistant_id"),
  threadId: text("thread_id"),
  selectedCategories: jsonb("selected_categories").default([]).$type<string[]>(),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  messageId: text("message_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  timestamp: true,
});

export const categorySelectionSchema = z.object({
  categories: z.array(z.enum(["regulatory", "clinical", "market", "rwe"])).min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type CategorySelection = z.infer<typeof categorySelectionSchema>;

export const CATEGORIES = [
  {
    id: "regulatory",
    name: "Regulatory Alerts",
    description: "FDA approvals, recalls, labeling changes, and regulatory updates",
    icon: "fas fa-gavel",
  },
  {
    id: "clinical",
    name: "Clinical Trial Updates", 
    description: "New studies, status changes, and results from ClinicalTrials.gov",
    icon: "fas fa-microscope",
  },
  {
    id: "market",
    name: "Market Access & Payer News",
    description: "PBM formulary changes, ICER reports, and CMS policy updates", 
    icon: "fas fa-handshake",
  },
  {
    id: "rwe",
    name: "Real-World Evidence & Public Health",
    description: "CDC WONDER data, AHRQ insights, and disease trend analysis",
    icon: "fas fa-chart-bar",
  },
] as const;
