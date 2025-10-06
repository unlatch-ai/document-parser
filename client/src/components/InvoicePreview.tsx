import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Loader2 
} from "lucide-react";
import type { InvoiceWithChunks } from "@shared/schema";

interface InvoicePreviewProps {
  invoice: InvoiceWithChunks;
  activeChunkId: string | null;
  onChunkClick: (chunkId: string) => void;
}

export default function InvoicePreview({ 
  invoice, 
  activeChunkId, 
  onChunkClick 
}: InvoicePreviewProps) {
  
  // Fetch invoice preview data
  const { data: previewData, isLoading } = useQuery<{
    data: string;
    mimeType: string;
    filename: string;
  }>({
    queryKey: ['/api/invoices', invoice.id, 'preview'],
    enabled: !!invoice.id,
  });

  const renderBoundingBoxes = () => {
    if (!invoice.chunks) return null;

    return invoice.chunks.map((chunk) => {
      const bbox = chunk.boundingBox as any;
      const isActive = chunk.id === activeChunkId;
      
      return (
        <div
          key={chunk.id}
          className={`
            absolute border-2 transition-all duration-200 cursor-pointer
            ${isActive 
              ? 'border-primary bg-primary/25 border-3 z-15' 
              : 'border-primary bg-primary/10 hover:bg-primary/20 hover:z-10'
            }
          `}
          style={{
            left: `${bbox.x}%`,
            top: `${bbox.y}%`,
            width: `${bbox.width}%`,
            height: `${bbox.height}%`,
          }}
          onClick={() => onChunkClick(chunk.id)}
          data-testid={`bounding-box-${chunk.id}`}
        >
          <div 
            className="absolute -top-6 left-0 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-semibold whitespace-nowrap"
            style={{ fontSize: '11px' }}
          >
            {chunk.title.toUpperCase()}
          </div>
        </div>
      );
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Loading invoice preview...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">Invoice Preview</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" data-testid="button-zoom-out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground px-2">100%</span>
          <Button variant="ghost" size="sm" data-testid="button-zoom-in">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" data-testid="button-fit-width">
            <Maximize className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-6 overflow-auto max-h-[900px] bg-muted/30">
        <div className="relative mx-auto bg-white shadow-lg" style={{ width: '600px', minHeight: '800px' }}>
          {/* Invoice Image */}
          {previewData && (
            <img
              src={`data:${previewData.mimeType};base64,${previewData.data}`}
              alt={invoice.filename}
              className="w-full h-auto"
              style={{ maxWidth: '100%', height: 'auto' }}
              data-testid="invoice-image"
            />
          )}
          
          {/* Bounding Boxes Overlay */}
          {renderBoundingBoxes()}
          
          {/* Fallback: Mock invoice content if no image */}
          {!previewData && (
            <div className="p-10 text-gray-900 space-y-6">
              {/* Mock Invoice Content */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">Invoice Preview</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {invoice.filename}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded">
                  <h3 className="font-semibold mb-2">Extracted Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    {invoice.chunks.length} chunks identified for review
                  </p>
                </div>
                
                {invoice.extractedText && (
                  <div className="bg-muted/30 p-4 rounded max-h-40 overflow-y-auto">
                    <h4 className="font-medium mb-2 text-sm">Extracted Text:</h4>
                    <p className="text-xs font-mono leading-relaxed">
                      {invoice.extractedText.slice(0, 500)}
                      {invoice.extractedText.length > 500 && '...'}
                    </p>
                  </div>
                )}
              </div>
              
              {renderBoundingBoxes()}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
