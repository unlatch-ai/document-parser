import { storage } from "../storage";
import { parseInvoiceWithVision } from "./openai";
import { type InsertInvoice, type InsertChunk } from "@shared/schema";
import fs from "fs/promises";
import sharp from "sharp";

export class FileProcessor {
  static async processUploadedFile(
    filePath: string,
    filename: string,
    mimeType: string,
    fileSize: number
  ): Promise<string> {
    try {
      // Create invoice record
      const invoiceData: InsertInvoice = {
        filename,
        originalPath: filePath,
        mimeType,
        fileSize,
        status: "processing",
        processingProgress: 10,
      };

      const invoice = await storage.createInvoice(invoiceData);

      // Process file asynchronously
      FileProcessor.processFileInBackground(invoice.id, filePath, mimeType);

      return invoice.id;
    } catch (error) {
      console.error("Error creating invoice record:", error);
      throw new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async processFileInBackground(
    invoiceId: string,
    filePath: string,
    mimeType: string
  ): Promise<void> {
    try {
      // Update progress
      await storage.updateInvoice(invoiceId, { processingProgress: 25 });

      // Convert to image if needed and get base64
      const base64Image = await FileProcessor.convertToBase64Image(filePath, mimeType);
      
      // Update progress
      await storage.updateInvoice(invoiceId, { processingProgress: 50 });

      // Parse with OpenAI Vision
      const parsedData = await parseInvoiceWithVision(base64Image);
      
      // Update progress
      await storage.updateInvoice(invoiceId, { processingProgress: 75 });

      // Create chunks
      const chunks = await Promise.all(
        parsedData.chunks.map(async (chunkData, index) => {
          const insertChunk: InsertChunk = {
            invoiceId,
            chunkType: chunkData.type,
            sequenceNumber: index + 1,
            title: chunkData.title,
            extractedData: chunkData.data,
            boundingBox: chunkData.boundingBox,
            confidence: chunkData.confidence,
            status: "pending",
            isEdited: false,
          };
          return await storage.createChunk(insertChunk);
        })
      );

      // Update invoice with final status
      await storage.updateInvoice(invoiceId, {
        status: "ready_for_review",
        processingProgress: 100,
        extractedText: parsedData.extractedText,
        totalChunks: chunks.length,
        approvedChunks: 0,
        rejectedChunks: 0,
      });

    } catch (error) {
      console.error(`Error processing file ${invoiceId}:`, error);
      await storage.updateInvoice(invoiceId, {
        status: "rejected",
        processingProgress: 0,
      });
    }
  }

  private static async convertToBase64Image(
    filePath: string,
    mimeType: string
  ): Promise<string> {
    try {
      if (mimeType.startsWith('image/')) {
        // For images, convert to JPEG and resize if needed
        const buffer = await sharp(filePath)
          .jpeg({ quality: 85 })
          .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
        
        return buffer.toString('base64');
      } else if (mimeType === 'application/pdf') {
        // For PDFs, we need a PDF to image conversion
        // For now, throw error as we need additional libraries
        throw new Error("PDF processing requires additional setup. Please use image files for now.");
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error("Error converting file to base64:", error);
      throw error;
    }
  }

  static async getFileAsBase64(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
  }
}
