import { type Invoice, type InsertInvoice, type Chunk, type InsertChunk, type UpdateChunk, type InvoiceWithChunks } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Invoice methods
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceWithChunks(id: string): Promise<InvoiceWithChunks | undefined>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByStatus(status: Invoice['status']): Promise<Invoice[]>;
  
  // Chunk methods
  createChunk(chunk: InsertChunk): Promise<Chunk>;
  getChunk(id: string): Promise<Chunk | undefined>;
  getChunksByInvoice(invoiceId: string): Promise<Chunk[]>;
  updateChunk(chunk: UpdateChunk): Promise<Chunk | undefined>;
  updateChunkStatus(id: string, status: Chunk['status']): Promise<Chunk | undefined>;
  
  // Stats methods
  getProcessingStats(): Promise<{
    processedToday: number;
    pendingApproval: number;
    accuracyRate: string;
    avgProcessTime: string;
  }>;
}

export class MemStorage implements IStorage {
  private invoices: Map<string, Invoice>;
  private chunks: Map<string, Chunk>;

  constructor() {
    this.invoices = new Map();
    this.chunks = new Map();
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date();
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      createdAt: now,
      updatedAt: now,
      status: insertInvoice.status ?? 'uploading',
      extractedText: insertInvoice.extractedText ?? null,
      processingProgress: insertInvoice.processingProgress ?? 0,
      totalChunks: insertInvoice.totalChunks ?? 0,
      approvedChunks: insertInvoice.approvedChunks ?? 0,
      rejectedChunks: insertInvoice.rejectedChunks ?? 0,
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceWithChunks(id: string): Promise<InvoiceWithChunks | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const invoiceChunks = Array.from(this.chunks.values())
      .filter(chunk => chunk.invoiceId === id)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    
    return {
      ...invoice,
      chunks: invoiceChunks,
    };
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice: Invoice = {
      ...invoice,
      ...updates,
      updatedAt: new Date(),
    };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getInvoicesByStatus(status: Invoice['status']): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(invoice => invoice.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createChunk(insertChunk: InsertChunk): Promise<Chunk> {
    const id = randomUUID();
    const now = new Date();
    const chunk: Chunk = {
      ...insertChunk,
      id,
      createdAt: now,
      updatedAt: now,
      status: insertChunk.status ?? 'pending',
      isEdited: insertChunk.isEdited ?? false,
      originalData: insertChunk.originalData ?? null,
    };
    this.chunks.set(id, chunk);
    return chunk;
  }

  async getChunk(id: string): Promise<Chunk | undefined> {
    return this.chunks.get(id);
  }

  async getChunksByInvoice(invoiceId: string): Promise<Chunk[]> {
    return Array.from(this.chunks.values())
      .filter(chunk => chunk.invoiceId === invoiceId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  async updateChunk(updateData: UpdateChunk): Promise<Chunk | undefined> {
    const { id, ...updates } = updateData;
    const chunk = this.chunks.get(id);
    if (!chunk) return undefined;
    
    const updatedChunk: Chunk = {
      ...chunk,
      ...updates,
      updatedAt: new Date(),
    };
    this.chunks.set(id, updatedChunk);
    return updatedChunk;
  }

  async updateChunkStatus(id: string, status: Chunk['status']): Promise<Chunk | undefined> {
    const chunk = this.chunks.get(id);
    if (!chunk) return undefined;
    
    const updatedChunk: Chunk = {
      ...chunk,
      status,
      updatedAt: new Date(),
    };
    this.chunks.set(id, updatedChunk);
    return updatedChunk;
  }

  async getProcessingStats(): Promise<{
    processedToday: number;
    pendingApproval: number;
    accuracyRate: string;
    avgProcessTime: string;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allInvoices = Array.from(this.invoices.values());
    const processedToday = allInvoices.filter(invoice => 
      new Date(invoice.createdAt) >= today
    ).length;
    
    const pendingApproval = allInvoices.filter(invoice => 
      invoice.status === 'ready_for_review'
    ).length;
    
    const allChunks = Array.from(this.chunks.values());
    const totalConfidence = allChunks.reduce((sum, chunk) => sum + chunk.confidence, 0);
    const avgConfidence = allChunks.length > 0 ? totalConfidence / allChunks.length : 0;
    const accuracyRate = `${(avgConfidence * 100).toFixed(1)}%`;
    
    return {
      processedToday,
      pendingApproval,
      accuracyRate,
      avgProcessTime: "2.4s",
    };
  }
}

export const storage = new MemStorage();
