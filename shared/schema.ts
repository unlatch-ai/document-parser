import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalPath: text("original_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  status: text("status", { enum: ["uploading", "processing", "ready_for_review", "approved", "rejected"] }).notNull().default("uploading"),
  extractedText: text("extracted_text"),
  processingProgress: integer("processing_progress").default(0),
  totalChunks: integer("total_chunks").default(0),
  approvedChunks: integer("approved_chunks").default(0),
  rejectedChunks: integer("rejected_chunks").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chunks = pgTable("chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  chunkType: text("chunk_type").notNull(), // 'header', 'invoice_details', 'bill_to', 'line_item', 'totals', 'payment_terms'
  sequenceNumber: integer("sequence_number").notNull(),
  title: text("title").notNull(),
  extractedData: jsonb("extracted_data").notNull(),
  boundingBox: jsonb("bounding_box").notNull(), // {x, y, width, height}
  confidence: real("confidence").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "editing"] }).notNull().default("pending"),
  isEdited: boolean("is_edited").default(false),
  originalData: jsonb("original_data"), // Store original before edits
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChunkSchema = createInsertSchema(chunks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateChunkSchema = insertChunkSchema.partial().extend({
  id: z.string(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Chunk = typeof chunks.$inferSelect;
export type InsertChunk = z.infer<typeof insertChunkSchema>;
export type UpdateChunk = z.infer<typeof updateChunkSchema>;

// Additional types for API responses
export type InvoiceWithChunks = Invoice & {
  chunks: Chunk[];
};

export type ProcessingStats = {
  processedToday: number;
  pendingApproval: number;
  accuracyRate: string;
  avgProcessTime: string;
};
