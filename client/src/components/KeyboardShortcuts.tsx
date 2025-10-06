import { Card, CardContent } from "@/components/ui/card";
import { Keyboard } from "lucide-react";

export default function KeyboardShortcuts() {
  return (
    <Card className="bg-primary/5 border-primary/20 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Keyboard className="text-primary text-xl mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm mb-2">Keyboard Shortcuts Active</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <kbd className="key-hint">Tab</kbd>
                <span className="text-muted-foreground">Next chunk</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="key-hint">Shift</kbd>
                <span className="text-muted-foreground">+</span>
                <kbd className="key-hint">Tab</kbd>
                <span className="text-muted-foreground">Previous</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="key-hint">Enter</kbd>
                <span className="text-muted-foreground">Approve</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="key-hint">R</kbd>
                <span className="text-muted-foreground">Reject</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="key-hint">E</kbd>
                <span className="text-muted-foreground">Edit</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="key-hint">Esc</kbd>
                <span className="text-muted-foreground">Cancel edit</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
