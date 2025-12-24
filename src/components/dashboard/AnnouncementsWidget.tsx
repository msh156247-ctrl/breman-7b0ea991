import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  title: string;
  content: string | null;
  priority: number;
  created_at: string;
}

export function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('dismissedAnnouncements');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissed));
  };

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleAnnouncements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            새로운 공지사항이 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Megaphone className="w-4 h-4" />
          공지사항
          {visibleAnnouncements.length > 0 && (
            <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {visibleAnnouncements.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleAnnouncements.map((announcement, index) => (
          <div
            key={announcement.id}
            className={cn(
              "group relative p-3 rounded-lg transition-colors",
              index === 0 && announcement.priority > 0
                ? "bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
                : "bg-muted/50 hover:bg-muted"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDismiss(announcement.id)}
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="pr-6">
              <p className="font-medium text-sm mb-1 line-clamp-1">
                {announcement.title}
              </p>
              {announcement.content && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {announcement.content}
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 mt-1">
                {new Date(announcement.created_at || '').toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Banner version for top of page
export function AnnouncementsBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchTopAnnouncement();
  }, []);

  const fetchTopAnnouncement = async () => {
    try {
      const dismissedBanner = localStorage.getItem('dismissedBannerAnnouncement');
      
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && dismissedBanner !== data.id) {
        setAnnouncement(data);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dismissedBannerAnnouncement', announcement.id);
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-3 rounded-lg mb-6">
      <div className="flex items-center gap-3">
        <Megaphone className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{announcement.title}</p>
          {announcement.content && (
            <p className="text-xs opacity-90 truncate">{announcement.content}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-primary-foreground hover:bg-white/20 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
