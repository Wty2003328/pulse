import { useState, useEffect } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Calendar as CalIcon, Clock, MapPin, Link as LinkIcon } from 'lucide-react';
import { Button } from '../ui/button';
import type { WidgetDimensions } from '../../lib/widget-size';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  location: string;
}

interface CalendarResponse { events: CalendarEvent[] }
interface CalendarStatus { connected: boolean }

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    if (diff >= 0 && diff < 1) return 'Today';
    if (diff >= 1 && diff < 2) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function isNow(start: string, end: string): boolean {
  const now = Date.now();
  return new Date(start).getTime() <= now && now <= new Date(end).getTime();
}

interface Props { dims?: WidgetDimensions }

export default function Calendar({ dims }: Props) {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const size = dims?.size ?? 'medium';

  useEffect(() => {
    fetch('/api/calendar/status').then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/calendar/auth-url');
      const { url } = await res.json();
      const popup = window.open(url, 'google-auth', 'width=500,height=600');
      // Poll for connection
      const poll = setInterval(async () => {
        const s = await fetch('/api/calendar/status').then(r => r.json());
        if (s.connected) {
          clearInterval(poll);
          setStatus(s);
          setConnecting(false);
          if (popup) popup.close();
        }
      }, 2000);
      setTimeout(() => { clearInterval(poll); setConnecting(false); }, 120000);
    } catch {
      setConnecting(false);
    }
  };

  if (!status || !status.connected) {
    if (size === 'small') {
      return (
        <div className="flex-1 flex items-center justify-center cursor-pointer" onClick={handleConnect}>
          <CalIcon className="w-6 h-6 text-muted-foreground/50" />
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <CalIcon className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Connect Google Calendar</p>
        <Button size="sm" onClick={handleConnect} disabled={connecting}>
          {connecting ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    );
  }

  return <CalendarEvents size={size} dims={dims} />;
}

function CalendarEvents({ size, dims }: { size: string; dims?: WidgetDimensions }) {
  const { data, loading, error } = useWidgetData<CalendarResponse>('/api/calendar/events', 300000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Loading events...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-xs">Error loading calendar</div>;
  if (!data || data.events.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">No upcoming events</div>;
  }

  /* Small: next few events */
  if (size === 'small') {
    return (
      <div className="flex flex-col h-full overflow-y-auto gap-1">
        {data.events.slice(0, 4).map((ev) => (
          <div key={ev.id} className={`py-1 border-l-2 pl-2 ${isNow(ev.start, ev.end) ? 'border-l-primary bg-primary/5' : 'border-l-border'}`}>
            <div className="text-xs text-muted-foreground">{ev.all_day ? 'All day' : formatTime(ev.start)}</div>
            <div className="text-xs font-medium truncate">{ev.title}</div>
          </div>
        ))}
      </div>
    );
  }

  /* Medium / Large: grouped by day */
  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of data.events) {
    const day = formatDate(ev.start || ev.end);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(ev);
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-2">
      {Array.from(grouped.entries()).map(([day, events]) => (
        <div key={day}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{day}</div>
          <div className="flex flex-col gap-0.5">
            {events.map((ev) => {
              const current = isNow(ev.start, ev.end);
              return (
                <div key={ev.id} className={`flex gap-2 p-1.5 rounded-md border-l-2 ${current ? 'border-l-primary bg-primary/5' : 'border-l-border'}`}>
                  <div className="w-14 shrink-0 text-right">
                    {ev.all_day ? (
                      <span className="text-xs text-muted-foreground">All day</span>
                    ) : (
                      <div>
                        <div className="text-xs font-medium">{formatTime(ev.start)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(ev.end)}</div>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{ev.title}</div>
                    {ev.location && size !== 'medium' && (
                      <div className="text-xs text-muted-foreground flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5 shrink-0" />{ev.location}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
