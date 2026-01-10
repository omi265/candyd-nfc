import { z } from "zod";

// ===========================================
// SHARED
// ===========================================

export const idSchema = z.string().cuid();

export const mediaItemSchema = z.object({
  url: z.string().url(),
  type: z.string(),
  size: z.number().nonnegative(),
  isNew: z.boolean().optional(),
  id: z.string().optional(),
});

// ===========================================
// MEMORIES
// ===========================================

export const createMemorySchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required"),
  date: z.string(), // Parsed to Date later
  time: z.string().optional(),
  location: z.string().optional(),
  emotions: z.string().optional(), // CSV or JSON
  events: z.string().optional(),   // CSV or JSON
  mood: z.string().optional(),
  productId: z.string().optional(),
  peopleIds: z.string().optional(), // JSON string
  mediaUrls: z.string().optional(), // JSON string
  mediaTypes: z.string().optional(), // JSON string
  mediaSizes: z.string().optional(), // JSON string
  orderedMedia: z.string().optional(), // JSON string
});

// ===========================================
// LIFE CHARM (LISTS)
// ===========================================

export const createLifeListSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name too long"),
  description: z.string().optional(),
  template: z.string().optional(),
  items: z.array(z.string()).optional(),
});

export const updateLifeListSchema = z.object({
  name: z.string().min(1, "Name is required").max(50).optional(),
  description: z.string().optional(),
});

// ===========================================
// LIFE CHARM (ITEMS)
// ===========================================

export const createLifeListItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  peopleIds: z.array(z.string()).optional(),
  whenType: z.string().optional(),
  targetDate: z.string().optional(), // string format of date
});

export const updateLifeListItemSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  peopleIds: z.array(z.string()).optional(),
  whenType: z.string().optional(),
  targetDate: z.union([z.string(), z.null()]).optional(),
  status: z.enum(["pending", "lived", "skipped"]).optional(),
});

// ===========================================
// LIFE CHARM (EXPERIENCES)
// ===========================================

export const markAsLivedSchema = z.object({
  reflection: z.string().optional(),
  location: z.string().optional(),
  date: z.string(),
  peopleIds: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaTypes: z.array(z.string()).optional(),
  mediaSizes: z.array(z.number()).optional(),
});

export const updateExperienceSchema = z.object({
  reflection: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional(),
  peopleIds: z.array(z.string()).optional(),
});

// ===========================================
// HABITS
// ===========================================

export const createHabitSchema = z.object({
  title: z.string().min(1, "Title is required").max(50),
  description: z.string().optional(),
  focusArea: z.string().min(1, "Focus area is required"),
  targetDays: z.number().int().min(1).default(66),
});

export const logHabitSchema = z.object({
    notes: z.string().optional()
});
