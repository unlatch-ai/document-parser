import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FileProcessor } from "./services/fileProcessor";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs/promises";
import { insertInvoiceSchema, updateChunkSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed.'));
    }
  },
});

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get processing stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getProcessingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get all invoices
  app.get("/api/invoices", async (req, res) => {
    try {
      const { status } = req.query;
      const invoices = status 
        ? await storage.getInvoicesByStatus(status as any)
        : await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get single invoice with chunks
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoiceWithChunks(id);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // Upload invoice file
  app.post("/api/invoices/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { filename, mimetype, size, path: filePath } = req.file;
      
      const invoiceId = await FileProcessor.processUploadedFile(
        filePath,
        filename,
        mimetype,
        size
      );

      res.json({ 
        invoiceId,
        message: "File uploaded successfully and processing started"
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload file"
      });
    }
  });

  // Get invoice file as base64 (for preview)
  app.get("/api/invoices/:id/preview", async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const base64Data = await FileProcessor.getFileAsBase64(invoice.originalPath);
      
      res.json({
        data: base64Data,
        mimeType: invoice.mimeType,
        filename: invoice.filename
      });

    } catch (error) {
      console.error("Error getting invoice preview:", error);
      res.status(500).json({ error: "Failed to get invoice preview" });
    }
  });

  // Update chunk data
  app.patch("/api/chunks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = updateChunkSchema.parse({ id, ...req.body });
      
      const updatedChunk = await storage.updateChunk(updateData);
      
      if (!updatedChunk) {
        return res.status(404).json({ error: "Chunk not found" });
      }

      // Update invoice stats if chunk status changed
      if (req.body.status) {
        const chunks = await storage.getChunksByInvoice(updatedChunk.invoiceId);
        const approvedCount = chunks.filter(c => c.status === 'approved').length;
        const rejectedCount = chunks.filter(c => c.status === 'rejected').length;
        
        await storage.updateInvoice(updatedChunk.invoiceId, {
          approvedChunks: approvedCount,
          rejectedChunks: rejectedCount,
        });
      }

      res.json(updatedChunk);

    } catch (error) {
      console.error("Error updating chunk:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to update chunk"
      });
    }
  });

  // Approve chunk
  app.post("/api/chunks/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedChunk = await storage.updateChunkStatus(id, 'approved');
      
      if (!updatedChunk) {
        return res.status(404).json({ error: "Chunk not found" });
      }

      // Update invoice stats
      const chunks = await storage.getChunksByInvoice(updatedChunk.invoiceId);
      const approvedCount = chunks.filter(c => c.status === 'approved').length;
      const rejectedCount = chunks.filter(c => c.status === 'rejected').length;
      
      await storage.updateInvoice(updatedChunk.invoiceId, {
        approvedChunks: approvedCount,
        rejectedChunks: rejectedCount,
      });

      res.json(updatedChunk);

    } catch (error) {
      console.error("Error approving chunk:", error);
      res.status(500).json({ error: "Failed to approve chunk" });
    }
  });

  // Reject chunk
  app.post("/api/chunks/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const updatedChunk = await storage.updateChunkStatus(id, 'rejected');
      
      if (!updatedChunk) {
        return res.status(404).json({ error: "Chunk not found" });
      }

      // Update invoice stats
      const chunks = await storage.getChunksByInvoice(updatedChunk.invoiceId);
      const approvedCount = chunks.filter(c => c.status === 'approved').length;
      const rejectedCount = chunks.filter(c => c.status === 'rejected').length;
      
      await storage.updateInvoice(updatedChunk.invoiceId, {
        approvedChunks: approvedCount,
        rejectedChunks: rejectedCount,
      });

      res.json(updatedChunk);

    } catch (error) {
      console.error("Error rejecting chunk:", error);
      res.status(500).json({ error: "Failed to reject chunk" });
    }
  });

  // Finalize invoice (mark as approved/rejected based on chunk statuses)
  app.post("/api/invoices/:id/finalize", async (req, res) => {
    try {
      const { id } = req.params;
      const chunks = await storage.getChunksByInvoice(id);
      
      const hasRejectedChunks = chunks.some(c => c.status === 'rejected');
      const allChunksReviewed = chunks.every(c => c.status !== 'pending' && c.status !== 'editing');
      
      if (!allChunksReviewed) {
        return res.status(400).json({ error: "All chunks must be reviewed before finalizing" });
      }

      const finalStatus = hasRejectedChunks ? 'rejected' : 'approved';
      const updatedInvoice = await storage.updateInvoice(id, { status: finalStatus });
      
      if (!updatedInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(updatedInvoice);

    } catch (error) {
      console.error("Error finalizing invoice:", error);
      res.status(500).json({ error: "Failed to finalize invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
