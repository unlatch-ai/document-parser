import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CloudUpload, 
  FolderOpen, 
  FileText, 
  FileImage, 
  Layers,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  invoiceId?: string;
  error?: string;
}

export default function UploadZone() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/invoices/upload', formData);
      return response.json();
    },
    onSuccess: (data, file) => {
      setUploadedFiles(prev => 
        prev.map(uf => 
          uf.file.name === file.name 
            ? { ...uf, status: 'success', invoiceId: data.invoiceId, progress: 100 }
            : uf
        )
      );
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({ 
        description: `${file.name} uploaded successfully and processing started` 
      });
    },
    onError: (error, file) => {
      setUploadedFiles(prev => 
        prev.map(uf => 
          uf.file.name === file.name 
            ? { ...uf, status: 'error', error: error.message, progress: 0 }
            : uf
        )
      );
      toast({ 
        description: `Failed to upload ${file.name}: ${error.message}`, 
        variant: "destructive" 
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Add files to upload state
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start uploads
    acceptedFiles.forEach(file => {
      // Simulate progress for UI
      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => 
          prev.map(uf => 
            uf.file.name === file.name && uf.status === 'uploading'
              ? { ...uf, progress: Math.min(uf.progress + 10, 90) }
              : uf
          )
        );
      }, 200);

      // Start actual upload
      uploadMutation.mutate(file);

      // Clear progress interval after 3 seconds
      setTimeout(() => clearInterval(progressInterval), 3000);
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(uf => uf.file.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <FileImage className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card 
        {...getRootProps()}
        className={`
          border-3 border-dashed transition-all duration-300 cursor-pointer p-12 text-center
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }
        `}
        data-testid="drop-zone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <CloudUpload className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Drop invoices here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports PDF, PNG, JPG up to 10MB per file
            </p>
          </div>
          <Button type="button" data-testid="button-browse-files">
            <FolderOpen className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4 text-red-500" />
              <span>PDF</span>
            </div>
            <div className="w-1 h-1 bg-border rounded-full"></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileImage className="w-4 h-4 text-yellow-500" />
              <span>PNG/JPG</span>
            </div>
            <div className="w-1 h-1 bg-border rounded-full"></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="w-4 h-4" />
              <span>Batch Upload</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <Card>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Upload Progress</h3>
          </div>
          <div className="p-4 space-y-3">
            {uploadedFiles.map((upload) => (
              <div 
                key={upload.file.name} 
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                data-testid={`upload-progress-${upload.file.name}`}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(upload.file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {upload.file.name}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(upload.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(upload.file.name)}
                        className="h-6 w-6 p-0"
                        data-testid={`button-remove-${upload.file.name}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{formatFileSize(upload.file.size)}</span>
                    <span>•</span>
                    <span>
                      {upload.status === 'uploading' && 'Uploading...'}
                      {upload.status === 'success' && 'Processing started'}
                      {upload.status === 'error' && upload.error}
                    </span>
                  </div>
                  {upload.status === 'uploading' && (
                    <Progress 
                      value={upload.progress} 
                      className="h-1" 
                      data-testid={`progress-${upload.file.name}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
