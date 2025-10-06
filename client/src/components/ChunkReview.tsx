import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  X, 
  Edit3, 
  Save, 
  Undo2, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import type { Chunk } from "@shared/schema";

interface ChunkReviewProps {
  chunks: Chunk[];
  activeChunkId: string | null;
  focusedChunkIndex: number;
  onChunkFocus: (chunkId: string) => void;
  onApprove: (chunkId: string) => void;
  onReject: (chunkId: string) => void;
  onUpdate: (chunkId: string, data: any) => void;
  isLoading: boolean;
}

export default function ChunkReview({
  chunks,
  activeChunkId,
  focusedChunkIndex,
  onChunkFocus,
  onApprove,
  onReject,
  onUpdate,
  isLoading
}: ChunkReviewProps) {
  const [editingChunks, setEditingChunks] = useState<Set<string>>(new Set());
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());

  const startEditing = (chunk: Chunk) => {
    setEditingChunks(prev => new Set(Array.from(prev).concat(chunk.id)));
    const extractedData = (chunk.extractedData as Record<string, any>) ?? {};
    setEditData(prev => ({
      ...prev,
      [chunk.id]: { ...extractedData }
    }));
  };

  const cancelEditing = (chunkId: string) => {
    setEditingChunks(prev => {
      const newSet = new Set(prev);
      newSet.delete(chunkId);
      return newSet;
    });
    setEditData(prev => {
      const newData = { ...prev };
      delete newData[chunkId];
      return newData;
    });
  };

  const saveChanges = (chunk: Chunk) => {
    const updatedData = editData[chunk.id];
    onUpdate(chunk.id, {
      extractedData: updatedData,
      isEdited: true,
      status: 'pending'
    });
    cancelEditing(chunk.id);
  };

  const updateEditData = (chunkId: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [chunkId]: {
        ...prev[chunkId],
        [field]: value
      }
    }));
  };

  const toggleExpanded = (chunkId: string) => {
    setExpandedChunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId);
      } else {
        newSet.add(chunkId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: Chunk['status']) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'editing':
        return (
          <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">
            <Edit3 className="w-3 h-3 mr-1" />
            Editing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const renderChunkData = (chunk: Chunk, isEditing: boolean) => {
    const data = isEditing ? editData[chunk.id] : chunk.extractedData;
    
    if (!data || typeof data !== 'object') {
      return (
        <div className="text-xs text-muted-foreground">
          No structured data available
        </div>
      );
    }

    const isExpanded = expandedChunks.has(chunk.id);
    const entries = Object.entries(data);
    const shouldShowToggle = entries.length > 3;
    const displayEntries = shouldShowToggle && !isExpanded ? entries.slice(0, 3) : entries;

    return (
      <div className="space-y-2 text-sm">
        {displayEntries.map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 gap-2 items-start">
            <Label className="text-xs text-muted-foreground capitalize">
              {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
            </Label>
            {isEditing ? (
              <div className="col-span-2">
                {typeof value === 'string' && value.length > 50 ? (
                  <Textarea
                    value={value as string}
                    onChange={(e) => updateEditData(chunk.id, key, e.target.value)}
                    className="h-20 text-xs"
                    data-testid={`input-${key}-${chunk.id}`}
                  />
                ) : (
                  <Input
                    value={value as string}
                    onChange={(e) => updateEditData(chunk.id, key, e.target.value)}
                    className="text-xs"
                    data-testid={`input-${key}-${chunk.id}`}
                  />
                )}
              </div>
            ) : (
              <span className="col-span-2 font-mono text-xs break-words">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            )}
          </div>
        ))}
        
        {shouldShowToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleExpanded(chunk.id)}
            className="h-6 p-0 text-xs"
            data-testid={`button-toggle-${chunk.id}`}
          >
            {isExpanded ? (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3 mr-1" />
                Show {entries.length - 3} more
              </>
            )}
          </Button>
        )}
        
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Confidence:</span>
          <span className={`col-span-2 font-mono text-xs font-semibold ${
            chunk.confidence > 0.9 ? 'text-green-600' : 
            chunk.confidence > 0.7 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {(chunk.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  if (chunks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No chunks available for review</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">Data Chunks</h3>
        <p className="text-xs text-muted-foreground mt-1">Review and approve each section</p>
      </div>
      
      <div className="overflow-y-auto max-h-[850px]">
        <div className="p-4 space-y-3">
          {chunks.map((chunk, index) => {
            const isActive = chunk.id === activeChunkId;
            const isFocused = index === focusedChunkIndex;
            const isEditing = editingChunks.has(chunk.id);
            const isApproved = chunk.status === 'approved';
            const isRejected = chunk.status === 'rejected';
            
            return (
              <div
                key={chunk.id}
                className={`
                  chunk-card rounded-lg p-4 cursor-pointer transition-all duration-150
                  ${isActive || isFocused
                    ? 'bg-accent border-2 border-primary' 
                    : 'bg-card border border-border hover:border-primary/50'
                  }
                  ${isApproved ? 'border-l-4 border-l-green-500 opacity-75 hover:opacity-100' : ''}
                  ${isRejected ? 'border-l-4 border-l-red-500' : ''}
                  ${isFocused ? 'transform translate-x-1 shadow-[-4px_0_0_0_hsl(var(--primary))]' : ''}
                `}
                tabIndex={0}
                onClick={() => onChunkFocus(chunk.id)}
                data-testid={`chunk-card-${chunk.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0
                      ${isActive ? 'bg-primary' : 'bg-muted'}
                    `}>
                      <span className={`text-xs font-bold ${
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                        {chunk.sequenceNumber}
                      </span>
                    </div>
                    <span className={`font-semibold text-sm ${
                      isActive ? 'text-accent-foreground' : 'text-foreground'
                    }`}>
                      {chunk.title}
                    </span>
                  </div>
                  {getStatusBadge(chunk.status)}
                </div>

                <div className="mb-4">
                  {renderChunkData(chunk, isEditing)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveChanges(chunk);
                        }}
                        disabled={isLoading}
                        className="flex-1"
                        data-testid={`button-save-${chunk.id}`}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save Changes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditing(chunk.id);
                        }}
                        data-testid={`button-cancel-${chunk.id}`}
                      >
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApprove(chunk.id);
                        }}
                        disabled={isLoading || isApproved}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${chunk.id}`}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReject(chunk.id);
                        }}
                        disabled={isLoading || isRejected}
                        className="flex-1"
                        data-testid={`button-reject-${chunk.id}`}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(chunk);
                        }}
                        disabled={isLoading}
                        data-testid={`button-edit-${chunk.id}`}
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => {
              chunks
                .filter(chunk => chunk.status === 'pending')
                .forEach(chunk => onApprove(chunk.id));
            }}
            disabled={isLoading || chunks.every(chunk => chunk.status !== 'pending')}
            data-testid="button-approve-all"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve All Remaining
          </Button>
          <Button variant="outline" disabled={isLoading} data-testid="button-save-progress">
            <Save className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700"
            disabled={isLoading}
            data-testid="button-reject-all"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
