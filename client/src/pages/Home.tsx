import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UploadZone from "@/components/UploadZone";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { 
  FileText, 
  Settings, 
  Plus, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Timer, 
  CheckCircle, 
  LoaderPinwheel,
  FileImage,
  Download
} from "lucide-react";
import type { Invoice, ProcessingStats } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();

  // Fetch processing stats
  const { data: stats, isLoading: statsLoading } = useQuery<ProcessingStats>({
    queryKey: ['/api/stats'],
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices'],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  const recentUploads = invoices?.slice(0, 5) || [];
  const processingQueue = invoices?.filter(inv => inv.status === 'processing') || [];

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'processing':
        return (
          <Badge variant="secondary" className="text-xs">
            <LoaderPinwheel className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'ready_for_review':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ready for Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Processed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    return <FileImage className="w-6 h-6 text-yellow-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="text-primary-foreground text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">InvoiceFlow</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Invoice Processing</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" data-testid="button-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button data-testid="button-new-upload">
                <Plus className="w-4 h-4 mr-2" />
                New Upload
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Processed Today</span>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="text-3xl font-bold text-foreground" data-testid="text-processed-today">
                {statsLoading ? '...' : stats?.processedToday || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">+23% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Pending Approval</span>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold text-foreground" data-testid="text-pending-approval">
                {statsLoading ? '...' : stats?.pendingApproval || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Accuracy Rate</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-foreground" data-testid="text-accuracy-rate">
                {statsLoading ? '...' : stats?.accuracyRate || '0%'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Avg. Process Time</span>
                <Timer className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground" data-testid="text-avg-process-time">
                {statsLoading ? '...' : stats?.avgProcessTime || '0s'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per invoice</p>
            </CardContent>
          </Card>
        </div>

        {/* Upload Zone */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <UploadZone />
          </CardContent>
        </Card>

        {/* Recent Uploads */}
        <Card className="mb-6">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Uploads</h2>
              <Button variant="ghost" className="text-sm text-primary">
                View All
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {invoicesLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <LoaderPinwheel className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading uploads...
              </div>
            ) : recentUploads.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                No uploads yet. Upload your first invoice to get started.
              </div>
            ) : (
              recentUploads.map((upload) => (
                <div 
                  key={upload.id} 
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  data-testid={`upload-item-${upload.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        {getFileIcon(upload.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate" data-testid={`text-filename-${upload.id}`}>
                          {upload.filename}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(upload.fileSize)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(upload.createdAt)}
                          </span>
                          {getStatusBadge(upload.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === 'processing' && (
                        <div className="flex items-center gap-2">
                          <div className="w-48 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${upload.processingProgress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">
                            {upload.processingProgress || 0}%
                          </span>
                        </div>
                      )}
                      {upload.status === 'ready_for_review' && (
                        <Button 
                          size="sm"
                          onClick={() => setLocation(`/approval/${upload.id}`)}
                          data-testid={`button-review-${upload.id}`}
                        >
                          Review Now
                        </Button>
                      )}
                      {upload.status === 'approved' && (
                        <Button 
                          size="sm"
                          onClick={() => setLocation(`/approval/${upload.id}`)}
                          data-testid={`button-view-${upload.id}`}
                        >
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Processing Queue */}
        {processingQueue.length > 0 && (
          <Card>
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Processing Queue</h2>
              <p className="text-sm text-muted-foreground mt-1">Invoices being parsed by AI</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {processingQueue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <LoaderPinwheel className="w-6 h-6 text-primary animate-spin" />
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{item.filename}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.processingProgress === 10 && "Starting analysis..."}
                          {item.processingProgress === 25 && "Preparing image..."}
                          {item.processingProgress === 50 && "Extracting data with AI..."}
                          {item.processingProgress === 75 && "Creating chunks..."}
                          {item.processingProgress === 100 && "Finalizing..."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {(item.totalChunks || 0) > 0 ? `${item.totalChunks} chunks found` : "Analyzing..."}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.processingProgress || 0}% complete
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
