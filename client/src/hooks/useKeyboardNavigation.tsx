import { useState, useCallback, useEffect } from "react";
import type { Chunk } from "@shared/schema";

interface UseKeyboardNavigationProps {
  chunks: Chunk[];
  onApprove: (chunk: Chunk) => void;
  onReject: (chunk: Chunk) => void;
  onEdit: (chunk: Chunk) => void;
  onFocusChange: (chunk: Chunk | null) => void;
}

export function useKeyboardNavigation({
  chunks,
  onApprove,
  onReject,
  onEdit,
  onFocusChange
}: UseKeyboardNavigationProps) {
  const [focusedChunkIndex, setFocusedChunkIndex] = useState(0);

  // Find first pending chunk on mount
  useEffect(() => {
    const firstPendingIndex = chunks.findIndex(chunk => chunk.status === 'pending');
    if (firstPendingIndex >= 0) {
      setFocusedChunkIndex(firstPendingIndex);
    }
  }, [chunks]);

  // Update focused chunk callback
  useEffect(() => {
    const focusedChunk = chunks[focusedChunkIndex];
    onFocusChange(focusedChunk || null);
  }, [focusedChunkIndex, chunks, onFocusChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle if user is typing in an input
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const focusedChunk = chunks[focusedChunkIndex];
    if (!focusedChunk) return;

    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) {
          // Previous chunk
          setFocusedChunkIndex(prev => 
            prev > 0 ? prev - 1 : chunks.length - 1
          );
        } else {
          // Next chunk
          setFocusedChunkIndex(prev => 
            prev < chunks.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (focusedChunk.status === 'pending') {
          onApprove(focusedChunk);
          // Move to next pending chunk
          const nextPendingIndex = chunks.findIndex((chunk, index) => 
            index > focusedChunkIndex && chunk.status === 'pending'
          );
          if (nextPendingIndex >= 0) {
            setFocusedChunkIndex(nextPendingIndex);
          }
        }
        break;

      case 'r':
      case 'R':
        event.preventDefault();
        if (focusedChunk.status === 'pending') {
          onReject(focusedChunk);
          // Move to next pending chunk
          const nextPendingIndex = chunks.findIndex((chunk, index) => 
            index > focusedChunkIndex && chunk.status === 'pending'
          );
          if (nextPendingIndex >= 0) {
            setFocusedChunkIndex(nextPendingIndex);
          }
        }
        break;

      case 'e':
      case 'E':
        event.preventDefault();
        onEdit(focusedChunk);
        break;

      case 'Escape':
        event.preventDefault();
        // Handle escape in parent component
        break;

      case 'ArrowDown':
        event.preventDefault();
        setFocusedChunkIndex(prev => 
          prev < chunks.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedChunkIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        break;

      default:
        break;
    }
  }, [chunks, focusedChunkIndex, onApprove, onReject, onEdit]);

  return {
    focusedChunkIndex,
    setFocusedChunkIndex,
    handleKeyDown
  };
}
