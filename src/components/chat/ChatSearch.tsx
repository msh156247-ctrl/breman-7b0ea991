import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  content: string;
}

interface ChatSearchProps {
  messages: Message[];
  onHighlight: (messageId: string | null, index: number, total: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSearch({ messages, onHighlight, isOpen, onClose }: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      setCurrentIndex(0);
      onHighlight(null, 0, 0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matchingIds = messages
      .filter(msg => msg.content.toLowerCase().includes(lowerQuery))
      .map(msg => msg.id);

    setResults(matchingIds);
    setCurrentIndex(0);

    if (matchingIds.length > 0) {
      onHighlight(matchingIds[0], 1, matchingIds.length);
    } else {
      onHighlight(null, 0, 0);
    }
  }, [messages, onHighlight]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setCurrentIndex(0);
      onHighlight(null, 0, 0);
    }
  }, [isOpen, onHighlight]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const goToPrevious = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onHighlight(results[newIndex], newIndex + 1, results.length);
  };

  const goToNext = () => {
    if (results.length === 0) return;
    const newIndex = currentIndex === results.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onHighlight(results[newIndex], newIndex + 1, results.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        goToPrevious();
      } else {
        goToNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        value={searchQuery}
        onChange={handleSearchChange}
        onKeyDown={handleKeyDown}
        placeholder="메시지 검색..."
        className="flex-1 h-8 text-sm"
        autoFocus
      />
      {results.length > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentIndex + 1} / {results.length}
        </span>
      )}
      {searchQuery && results.length === 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          결과 없음
        </span>
      )}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToPrevious}
          disabled={results.length === 0}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={goToNext}
          disabled={results.length === 0}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
