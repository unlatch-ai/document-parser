import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import InvoicePreview from "@/components/InvoicePreview";
import ChunkReview from "@/components/ChunkReview";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FolderOutput, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  Info
} from "lucide-react";
import type { InvoiceWithChunks, Chunk } from "@shared/schema";

export default function ApprovalWorkflow() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch invoice with chunks
  const { data: invoice, isLoading } = useQuery<InvoiceWithChunks>({
    queryKey: ['/api/invoices', id],
    enabled: !!id,
  });

  // Set initial active chunk
  useEffect(() => {
    if (invoice?.chunks && !activeChunkId) {
      const firstPendingChunk = invoice.chunks.find(chunk => chunk.status === 'pending');
      if (firstPendingChunk) {
        setActiveChunkId(firstPendingChunk.id);
      }
    }
  }, [invoice, activeChunkId]);

  // Mutations for chunk actions
  const approveChunkMutation = useMutation({
    mutationFn: async (chunkId: string) => {
      const response = await apiRequest('POST', `/api/chunks/${chunkId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({ description: "Chunk approved successfully" });
    },
    onError: (error) => {
      toast({ description: `Failed to approve chunk: ${error.message}`, variant: "destructive" });
    }
  });

  const rejectChunkMutation = useMutation({
    mutationFn: async (chunkId: string) => {
      const response = await apiRequest('POST', `/api/chunks/${chunkId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({ description: "Chunk rejected" });
    },
    onError: (error) => {
      toast({ description: `Failed to reject chunk: ${error.message}`, variant: "destructive" });
    }
  });

  const updateChunkMutation = useMutation({
    mutationFn: async ({ chunkId, data }: { chunkId: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/chunks/${chunkId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({ description: "Chunk updated successfully" });
    },
    onError: (error) => {
      toast({ description: `Failed to update chunk: ${error.message}`, variant: "destructive" });
    }
  });

  const finalizeInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${id}/finalize`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({ description: "Invoice finalized successfully" });
      setLocation('/');
    },
    onError: (error) => {
      toast({ description: `Failed to finalize invoice: ${error.message}`, variant: "destructive" });
    }
  });

  // Keyboard navigation
  const {
    focusedChunkIndex,
    handleKeyDown
  } = useKeyboardNavigation({
    chunks: invoice?.chunks || [],
    onApprove: (chunk) => approveChunkMutation.mutate(chunk.id),
    onReject: (chunk) => rejectChunkMutation.mutate(chunk.id),
    onEdit: (chunk) => setActiveChunkId(chunk.id),
    onFocusChange: (chunk) => setActiveChunkId(chunk?.id || null)
  });

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      handleKeyDown(e);
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleKeyDown]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">Invoice Not Found</h1>
              <p className="text-sm text-muted-foreground mb-4">
                The invoice you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = (invoice.totalChunks || 0) > 0 
    ? Math.round((((invoice.approvedChunks || 0) + (invoice.rejectedChunks || 0)) / (invoice.totalChunks || 1)) * 100)
    : 0;

  const pendingChunks = (invoice.totalChunks || 0) - (invoice.approvedChunks || 0) - (invoice.rejectedChunks || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            In Review
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation('/')}
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-border"></div>
              <h1 className="text-lg font-semibold text-foreground">Approval Workflow</h1>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status)}
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Keyboard Shortcuts Guide */}
        <KeyboardShortcuts />

        {/* Progress Header */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground" data-testid="text-invoice-filename">
                  {invoice.filename}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Review and approve parsed data chunks
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                data-testid="button-export-invoice"
              >
                <FolderOutput className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Approval Progress</span>
                  <span className="font-mono font-medium text-foreground" data-testid="text-progress-count">
                    {(invoice.approvedChunks || 0) + (invoice.rejectedChunks || 0)}/{invoice.totalChunks || 0} chunks
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2.5" data-testid="progress-approval" />
              </div>
              <div className="flex gap-2">
                <div className="text-center px-4 py-2 bg-green-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Approved</div>
                  <div className="text-lg font-bold text-green-600" data-testid="text-approved-count">
                    {invoice.approvedChunks || 0}
                  </div>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-lg">
                  <div className="text-xs text-muted-foreground">Rejected</div>
                  <div className="text-lg font-bold text-red-600" data-testid="text-rejected-count">
                    {invoice.rejectedChunks || 0}
                  </div>
                </div>
                <div className="text-center px-4 py-2 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="text-lg font-bold text-foreground" data-testid="text-pending-count">
                    {pendingChunks}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Split View: Invoice Preview + Chunk Details */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left: Invoice Preview */}
          <div className="lg:col-span-3">
            <InvoicePreview 
              invoice={invoice} 
              activeChunkId={activeChunkId}
              onChunkClick={setActiveChunkId}
            />
          </div>

          {/* Right: Chunk Review Panel */}
          <div className="lg:col-span-2">
            <ChunkReview
              chunks={invoice.chunks}
              activeChunkId={activeChunkId}
              focusedChunkIndex={focusedChunkIndex}
              onChunkFocus={setActiveChunkId}
              onApprove={(chunkId) => approveChunkMutation.mutate(chunkId)}
              onReject={(chunkId) => rejectChunkMutation.mutate(chunkId)}
              onUpdate={(chunkId, data) => updateChunkMutation.mutate({ chunkId, data })}
              isLoading={approveChunkMutation.isPending || rejectChunkMutation.isPending}
            />
          </div>

        </div>

        {/* Bulk Actions Footer */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Review Complete?</span>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground" data-testid="text-pending-chunks">
                    {pendingChunks} chunks pending approval
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setLocation('/')}
                  data-testid="button-back-upload"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Upload
                </Button>
                <Button 
                  onClick={() => finalizeInvoiceMutation.mutate()}
                  disabled={pendingChunks > 0 || finalizeInvoiceMutation.isPending}
                  data-testid="button-finalize-invoice"
                >
                  <FolderOutput className="w-4 h-4 mr-2" />
                  Finalize & Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
