# Invoice Processing System

## Overview

This is an AI-powered invoice processing application that allows users to upload invoices (images or PDFs), automatically extracts structured data using OpenAI's vision API, and provides a chunk-based approval workflow for reviewing and editing extracted information. The system breaks down invoices into logical sections (headers, line items, totals, etc.) and enables human-in-the-loop validation before final approval.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: wouter - A lightweight client-side routing library

**State Management**: 
- TanStack Query (React Query) for server state and data fetching
- Local React state for UI interactions
- No global state management library needed

**UI Component Library**: shadcn/ui with Radix UI primitives
- Tailwind CSS for styling with CSS variables for theming
- Custom design tokens defined in CSS variables
- Component aliases configured for clean imports (@/components, @/lib, @/hooks)

**Key Frontend Patterns**:
- Component composition with shadcn/ui primitives
- Custom hooks for keyboard navigation and form handling
- Query-based data fetching with automatic refetching for real-time updates
- Toast notifications for user feedback

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ES modules

**API Design**: RESTful HTTP endpoints
- `/api/invoices` - Invoice CRUD operations
- `/api/invoices/upload` - File upload handling
- `/api/chunks` - Chunk approval/rejection/editing
- `/api/stats` - Processing statistics

**File Processing Pipeline**:
1. Multer handles multipart file uploads with validation
2. Files stored in local `uploads/` directory
3. Background processing converts files to base64 images (Sharp library for image processing)
4. OpenAI Vision API extracts structured data in chunks
5. Chunks stored with bounding box coordinates for visual overlay

**Development/Production Split**:
- Development: Vite dev server with HMR
- Production: Static assets served from Express with built client

### Data Storage

**Database**: PostgreSQL with Drizzle ORM
- Connection via Neon serverless driver (@neondatabase/serverless)
- Schema defined in `shared/schema.ts` with Drizzle table definitions
- Type-safe queries with Drizzle's query builder

**Schema Design**:

*Invoices Table*:
- Stores file metadata (filename, path, mime type, size)
- Processing status: uploading → processing → ready_for_review → approved/rejected
- Progress tracking (processingProgress, totalChunks, approvedChunks, rejectedChunks)
- Extracted text storage

*Chunks Table*:
- References parent invoice (cascade delete)
- Chunk type classification (header, invoice_details, bill_to, line_item, totals, payment_terms)
- Sequence number for ordering
- Extracted data stored as JSONB
- Bounding box coordinates as JSONB for visual highlighting
- Confidence scores from AI extraction
- Status tracking: pending → approved/rejected/editing
- Edit history (isEdited flag, originalData backup)

**In-Memory Fallback**: MemStorage class implements the same interface as database storage for development/testing without database setup

**Session Storage**: connect-pg-simple for PostgreSQL-backed Express sessions

### External Dependencies

**OpenAI Integration**:
- GPT-5 vision model for invoice parsing
- Structured JSON extraction with custom system prompts
- Chunk-based output format with bounding boxes and confidence scores
- API key configured via environment variables

**File Upload & Processing**:
- Multer for handling multipart/form-data uploads
- Sharp for image conversion and manipulation
- Support for JPEG, PNG, WebP, and PDF formats
- 10MB file size limit enforced

**Third-Party UI Libraries**:
- react-dropzone for drag-and-drop file uploads
- date-fns for date formatting
- React Hook Form with Zod resolvers for form validation

**Development Tools**:
- Replit-specific Vite plugins (cartographer, dev-banner, runtime-error-modal)
- TSX for running TypeScript in development
- esbuild for production server bundling

**Validation**: 
- Zod schemas for runtime type validation
- drizzle-zod for automatic schema generation from database tables
- Type safety across client-server boundary via shared schema definitions