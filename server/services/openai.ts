import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedChunk {
  type: string;
  title: string;
  data: Record<string, any>;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface ParsedInvoiceData {
  chunks: ExtractedChunk[];
  extractedText: string;
}

export async function parseInvoiceWithVision(base64Image: string): Promise<ParsedInvoiceData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert invoice parser. Analyze the invoice image and extract structured data organized into logical chunks. Each chunk should represent a distinct section of the invoice (header, invoice details, bill to, line items, totals, payment terms).

For each chunk, provide:
1. type: One of 'header', 'invoice_details', 'bill_to', 'line_item', 'totals', 'payment_terms'
2. title: A descriptive title for the chunk
3. data: Extracted field data as key-value pairs
4. boundingBox: Approximate coordinates {x, y, width, height} as percentages (0-100)
5. confidence: Confidence score (0-1)

Return JSON in this exact format:
{
  "chunks": [
    {
      "type": "header",
      "title": "Header Information",
      "data": {"vendor": "...", "address": "...", "email": "..."},
      "boundingBox": {"x": 0, "y": 0, "width": 100, "height": 15},
      "confidence": 0.95
    }
  ],
  "extractedText": "Full text content of the invoice"
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Parse this invoice image and extract all data chunks with their bounding boxes. Be precise with the coordinates and confident in your extractions."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (!result.chunks || !Array.isArray(result.chunks)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      chunks: result.chunks.map((chunk: any, index: number) => ({
        ...chunk,
        sequenceNumber: index + 1,
      })),
      extractedText: result.extractedText || "",
    };

  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    throw new Error(`Failed to parse invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function enhanceChunkData(chunkData: any, chunkType: string): Promise<Record<string, any>> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are an expert data validator for invoice processing. Clean and structure the provided ${chunkType} data according to best practices. Return validated JSON data with consistent formatting.`
        },
        {
          role: "user",
          content: `Clean and structure this ${chunkType} data: ${JSON.stringify(chunkData)}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Data enhancement error:", error);
    return chunkData; // Return original data if enhancement fails
  }
}
