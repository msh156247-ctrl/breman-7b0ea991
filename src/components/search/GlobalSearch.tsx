import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Briefcase, User, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  type: 'team' | 'project' | 'user';
  title: string;
  subtitle?: string;
  avatar?: string | null;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name, slogan, emblem_url')
        .or(`name.ilike.%${searchQuery}%,slogan.ilike.%${searchQuery}%`)
        .limit(3);

      teams?.forEach(team => {
        searchResults.push({
          id: team.id,
          type: 'team',
          title: team.name,
          subtitle: team.slogan || undefined,
          avatar: team.emblem_url,
        });
      });

      // Search projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, description')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(3);

      projects?.forEach(project => {
        searchResults.push({
          id: project.id,
          type: 'project',
          title: project.title,
          subtitle: project.description?.substring(0, 50) || undefined,
        });
      });

      // Search users (public profiles)
      const { data: users } = await supabase
        .from('public_profiles')
        .select('id, name, bio, avatar_url')
        .or(`name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .limit(3);

      users?.forEach(user => {
        if (user.id) {
          searchResults.push({
            id: user.id,
            type: 'user',
            title: user.name || '익명',
            subtitle: user.bio?.substring(0, 50) || undefined,
            avatar: user.avatar_url,
          });
        }
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(results[selectedIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    switch (result.type) {
      case 'team':
        navigate(`/teams/${result.id}`);
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'user':
        navigate(`/profile/${result.id}`);
        break;
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'team':
        return <Users className="w-4 h-4 text-primary" />;
      case 'project':
        return <Briefcase className="w-4 h-4 text-secondary" />;
      case 'user':
        return <User className="w-4 h-4 text-accent" />;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'team':
        return '팀';
      case 'project':
        return '프로젝트';
      case 'user':
        return '사용자';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          ref={inputRef}
          placeholder="팀, 프로젝트, 사용자 검색..." 
          className="w-64 pl-9 pr-8 bg-muted/50 border-0 focus-visible:ring-1"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left transition-colors",
                    index === selectedIndex 
                      ? "bg-muted" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result.avatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatar} />
                      <AvatarFallback>
                        {getIcon(result.type)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {getIcon(result.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                    {getTypeLabel(result.type)}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              검색 결과가 없습니다
            </div>
          ) : null}

          {/* Quick links */}
          {query.length >= 2 && (
            <div className="border-t border-border p-2 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  navigate(`/teams?search=${encodeURIComponent(query)}`);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <Users className="w-3 h-3 mr-1" />
                팀에서 검색
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => {
                  navigate(`/projects?search=${encodeURIComponent(query)}`);
                  setIsOpen(false);
                  setQuery('');
                }}
              >
                <Briefcase className="w-3 h-3 mr-1" />
                프로젝트에서 검색
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
