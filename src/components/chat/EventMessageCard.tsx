import { CalendarDays, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface EventMessageCardProps {
  eventData: {
    title: string;
    event_date: string;
    event_time?: string | null;
    description?: string | null;
  };
  isOwn: boolean;
  onOpenSchedule?: () => void;
}

export function EventMessageCard({ eventData, isOwn, onOpenSchedule }: EventMessageCardProps) {
  const eventDate = new Date(eventData.event_date);
  
  return (
    <button
      onClick={onOpenSchedule}
      className={`w-full text-left rounded-xl border overflow-hidden transition-opacity hover:opacity-90 cursor-pointer ${
        isOwn 
          ? 'bg-primary/10 border-primary/20' 
          : 'bg-accent border-border'
      }`}
    >
      {/* Header strip */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${
        isOwn ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        <CalendarDays className="h-3 w-3" />
        일정 공유
      </div>

      {/* Event content */}
      <div className="px-3 py-2.5 space-y-1.5">
        <p className={`font-semibold text-sm ${isOwn ? 'text-primary-foreground' : 'text-foreground'}`}>
          {eventData.title}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs flex items-center gap-1 ${
            isOwn ? 'text-primary' : 'text-muted-foreground'
          }`}>
            <CalendarDays className="h-3 w-3" />
            {format(eventDate, 'M월 d일 (EEE)', { locale: ko })}
          </span>
          {eventData.event_time && (
            <span className={`text-xs flex items-center gap-1 ${
              isOwn ? 'text-primary' : 'text-muted-foreground'
            }`}>
              <Clock className="h-3 w-3" />
              {eventData.event_time}
            </span>
          )}
        </div>

        {eventData.description && (
          <p className={`text-xs leading-relaxed ${
            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {eventData.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className={`px-3 py-1.5 text-[10px] ${
        isOwn ? 'text-primary/60' : 'text-muted-foreground/60'
      }`}>
        탭하여 일정 보기
      </div>
    </button>
  );
}
