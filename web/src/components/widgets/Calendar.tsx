import { useState, useEffect } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { Calendar as CalIcon, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import type { WidgetDimensions } from '../../lib/widget-size';

interface CalendarEvent { id: string; title: string; start: string; end: string; all_day: boolean; location: string }
interface CalendarResponse { events: CalendarEvent[] }
interface CalendarStatus { connected: boolean }

function formatTime(iso: string) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return iso; } }
function formatDate(iso: string) { try { const d=new Date(iso),t=new Date();t.setHours(0,0,0,0);const diff=(d.getTime()-t.getTime())/864e5;if(diff>=0&&diff<1)return'Today';if(diff>=1&&diff<2)return'Tomorrow';return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});} catch{return'';} }
function isNow(s: string, e: string) { const now=Date.now();return new Date(s).getTime()<=now&&now<=new Date(e).getTime(); }

interface Props { dims?: WidgetDimensions }

export default function Calendar({ dims }: Props) {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => { fetch('/api/calendar/status').then(r=>r.json()).then(setStatus).catch(()=>setStatus({connected:false})); }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/calendar/auth-url'); const { url } = await res.json();
      const popup = window.open(url, 'google-auth', 'width=500,height=600');
      const poll = setInterval(async () => { const s = await fetch('/api/calendar/status').then(r=>r.json()); if(s.connected){clearInterval(poll);setStatus(s);setConnecting(false);if(popup)popup.close();} }, 2000);
      setTimeout(() => { clearInterval(poll); setConnecting(false); }, 120000);
    } catch { setConnecting(false); }
  };

  if (!status || !status.connected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center cursor-pointer" onClick={handleConnect}>
        <CalIcon className="w-8 h-8 text-muted-foreground/50" />
        <p className="hidden @[130px]:block text-xs text-muted-foreground">Connect Calendar</p>
        <div className="hidden @[200px]:block"><Button size="sm" disabled={connecting}>{connecting ? 'Connecting...' : 'Connect'}</Button></div>
      </div>
    );
  }

  return <CalendarEvents />;
}

function CalendarEvents() {
  const { data, loading, error } = useWidgetData<CalendarResponse>('/api/calendar/events', 300000);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-destructive text-sm">Error</div>;
  if (!data || data.events.length === 0) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No events</div>;

  const grouped = new Map<string, CalendarEvent[]>();
  for (const ev of data.events) { const day = formatDate(ev.start||ev.end); if (!grouped.has(day)) grouped.set(day,[]); grouped.get(day)!.push(ev); }

  return (
    <div className="flex flex-col h-full overflow-y-auto gap-2">
      {Array.from(grouped.entries()).map(([day, events]) => (
        <div key={day}>
          <div className="hidden @[130px]:block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{day}</div>
          <div className="flex flex-col gap-0.5">
            {events.map((ev) => {
              const current = isNow(ev.start, ev.end);
              return (
                <div key={ev.id} className={`flex gap-2 p-1.5 rounded-md border-l-2 ${current ? 'border-l-primary bg-primary/5' : 'border-l-border'}`}>
                  <div className="hidden @[200px]:block w-14 shrink-0 text-right">
                    {ev.all_day ? <span className="cq-text-xs text-muted-foreground">All day</span> : (
                      <div><div className="cq-text-sm font-medium">{formatTime(ev.start)}</div><div className="cq-text-xs text-muted-foreground">{formatTime(ev.end)}</div></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="cq-text-base font-medium truncate">{ev.title}</div>
                    {ev.location && <div className="hidden @[300px]:flex text-xs text-muted-foreground items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5 shrink-0"/>{ev.location}</div>}
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
