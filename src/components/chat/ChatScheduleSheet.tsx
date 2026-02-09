import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  Clock, 
  Loader2,
  CalendarPlus,
  Share2
} from 'lucide-react';
import { format, isSameDay, isAfter, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toast } from 'sonner';

interface ChatEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  conversation_id: string;
  created_by: string;
  created_at: string;
}

interface ChatScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentUserId?: string;
  onShareEvent?: (eventData: { title: string; event_date: string; event_time: string | null; description: string | null }) => void;
}

export function ChatScheduleSheet({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  onShareEvent
}: ChatScheduleSheetProps) {
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    time: '',
    shareToChat: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEvents();
    }
  }, [open, conversationId]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_events')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('event_date', { ascending: true }) as { data: ChatEvent[] | null; error: any };

      if (error) {
        // Table might not exist yet - that's ok
        if (error.code === '42P01') {
          setEvents([]);
          return;
        }
        throw error;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim() || !selectedDate || !currentUserId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('chat_events')
        .insert({
          title: newEvent.title.trim(),
          description: newEvent.description.trim() || null,
          event_date: format(selectedDate, 'yyyy-MM-dd'),
          event_time: newEvent.time || null,
          conversation_id: conversationId,
          created_by: currentUserId
        } as any)
        .select()
        .single() as { data: ChatEvent | null; error: any };

      if (error) throw error;

      if (data) {
        setEvents(prev => [...prev, data].sort((a, b) => 
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        ));

        // Share to chat if option is selected
        if (newEvent.shareToChat && onShareEvent) {
          onShareEvent({
            title: data.title,
            event_date: data.event_date,
            event_time: data.event_time,
            description: data.description
          });
        }
      }
      setNewEvent({ title: '', description: '', time: '', shareToChat: true });
      setIsAddingEvent(false);
      toast.success('일정이 추가되었습니다');
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error('일정 추가에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await (supabase
        .from('chat_events') as any)
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('일정이 삭제되었습니다');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('일정 삭제에 실패했습니다');
    }
  };

  const eventsOnSelectedDate = events.filter(e => 
    selectedDate && isSameDay(new Date(e.event_date), selectedDate)
  );

  const upcomingEvents = events.filter(e => 
    isAfter(new Date(e.event_date), startOfDay(new Date())) ||
    isSameDay(new Date(e.event_date), new Date())
  ).slice(0, 5);

  const eventDates = events.map(e => new Date(e.event_date));

  const content = (
    <div className="flex flex-col h-full gap-4">
      {/* Calendar */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ko}
          className="rounded-md border"
          modifiers={{
            hasEvent: eventDates
          }}
          modifiersStyles={{
            hasEvent: {
              fontWeight: 'bold',
              textDecoration: 'underline',
              textDecorationColor: 'hsl(var(--primary))'
            }
          }}
        />
      </div>

      <Separator />

      {/* Selected Date Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">
            {selectedDate ? format(selectedDate, 'M월 d일 일정', { locale: ko }) : '날짜를 선택하세요'}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddingEvent(true)}
            disabled={!selectedDate}
          >
            <Plus className="h-4 w-4 mr-1" />
            추가
          </Button>
        </div>

        {isAddingEvent && (
          <div className="space-y-3 p-3 rounded-lg border bg-muted/50 mb-3">
            <div>
              <Label htmlFor="event-title">제목</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                placeholder="일정 제목"
              />
            </div>
            <div>
              <Label htmlFor="event-time">시간 (선택)</Label>
              <Input
                id="event-time"
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="event-desc">설명 (선택)</Label>
              <Textarea
                id="event-desc"
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                placeholder="일정 설명"
                rows={2}
              />
            </div>
            {onShareEvent && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="share-to-chat"
                  checked={newEvent.shareToChat}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, shareToChat: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="share-to-chat" className="text-xs text-muted-foreground cursor-pointer">
                  채팅에 일정 공유
                </Label>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setIsAddingEvent(false)}>
                취소
              </Button>
              <Button size="sm" onClick={handleAddEvent} disabled={!newEvent.title.trim() || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장'}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[150px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : eventsOnSelectedDate.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">이 날짜에 일정이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventsOnSelectedDate.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.title}</p>
                    {event.event_time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {event.event_time}
                      </div>
                    )}
                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                  {event.created_by === currentUserId && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {onShareEvent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => onShareEvent({
                            title: event.title,
                            event_date: event.event_date,
                            event_time: event.event_time,
                            description: event.description
                          })}
                          title="채팅에 공유"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {upcomingEvents.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="font-medium text-sm mb-3">다가오는 일정</h4>
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent p-2 rounded"
                  onClick={() => setSelectedDate(new Date(event.event_date))}
                >
                  <Badge variant="outline" className="shrink-0">
                    {format(new Date(event.event_date), 'M/d', { locale: ko })}
                  </Badge>
                  <span className="truncate">{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>일정</DrawerTitle>
            <DrawerDescription>채팅방 일정을 관리하세요</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px]">
        <SheetHeader>
          <SheetTitle>일정</SheetTitle>
          <SheetDescription>채팅방 일정을 관리하세요</SheetDescription>
        </SheetHeader>
        <div className="mt-4 h-[calc(100vh-120px)] overflow-y-auto">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
