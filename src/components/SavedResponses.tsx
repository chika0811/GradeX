import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SavedResponse {
  id: string;
  content: string;
  savedAt: Date;
  category?: string;
}

const STORAGE_KEY = 'gradex_saved_responses';

export function SavedResponses() {
  const [saved, setSaved] = useState<SavedResponse[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setSaved(parsed.map((r: any) => ({ ...r, savedAt: new Date(r.savedAt) })));
    }
  }, []);

  const saveData = (data: SavedResponse[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSaved(data);
  };

  const deleteResponse = (id: string) => {
    const updated = saved.filter(r => r.id !== id);
    saveData(updated);
  };

  const clearAll = () => {
    saveData([]);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bookmark className="w-5 h-5" />
          {saved.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {saved.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Saved Responses</SheetTitle>
            {saved.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          {saved.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bookmark className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved responses yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click the bookmark icon on AI responses to save them
              </p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {saved.map((response) => (
                <Card key={response.id} className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-xs text-muted-foreground">
                      {response.savedAt.toLocaleDateString()} at{' '}
                      {response.savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteResponse(response.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{response.content}</p>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function saveResponse(content: string, category?: string) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const existing = stored ? JSON.parse(stored) : [];
  
  const newResponse: SavedResponse = {
    id: crypto.randomUUID(),
    content,
    savedAt: new Date(),
    category,
  };
  
  const updated = [newResponse, ...existing].slice(0, 50); // Keep max 50
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
