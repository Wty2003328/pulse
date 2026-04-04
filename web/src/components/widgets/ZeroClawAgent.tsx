import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Wrench, CheckCircle, Circle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import type { WidgetDimensions } from '../../lib/widget-size';

interface ZCMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'system';
  content: string;
  timestamp: number;
  toolName?: string;
}

interface ZCConfig { url: string; token: string }

function useZeroClawWs(config: ZCConfig | null) {
  const [messages, setMessages] = useState<ZCMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const idRef = useRef(0);

  const connect = useCallback(() => {
    if (!config || !config.url) return;
    const wsUrl = config.url.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/chat';
    const fullUrl = config.token ? `${wsUrl}?token=${encodeURIComponent(config.token)}` : wsUrl;
    try {
      const ws = new WebSocket(fullUrl);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(() => connect(), 5000); };
      ws.onerror = () => setConnected(false);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'chunk') {
            setStreaming((prev) => prev + (data.content || ''));
          } else if (data.type === 'done') {
            setStreaming('');
            setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: 'assistant', content: data.full_response || data.content || '', timestamp: Date.now() }]);
          } else if (data.type === 'tool_call') {
            setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: 'tool_call', content: JSON.stringify(data.args || {}), timestamp: Date.now(), toolName: data.name }]);
          } else if (data.type === 'tool_result') {
            setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: 'tool_result', content: data.output || '', timestamp: Date.now(), toolName: data.name }]);
          } else if (data.type === 'error') {
            setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: 'system', content: `Error: ${data.message || data.error || ''}`, timestamp: Date.now() }]);
          }
        } catch { /* ignore parse errors */ }
      };
      wsRef.current = ws;
    } catch { setConnected(false); }
  }, [config]);

  useEffect(() => { connect(); return () => { wsRef.current?.close(); }; }, [connect]);

  const send = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', content: text }));
      setMessages((prev) => [...prev, { id: `m-${idRef.current++}`, role: 'user', content: text, timestamp: Date.now() }]);
    }
  }, []);

  return { messages, connected, streaming, send };
}

interface Props { dims?: WidgetDimensions }

export default function ZeroClawAgent({ dims }: Props) {
  const [config, setConfig] = useState<ZCConfig | null>(null);
  const [input, setInput] = useState('');
  const size = dims?.size ?? 'medium';
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/zeroclaw/config').then(r => r.json()).then((c: ZCConfig) => {
      if (c.url) setConfig(c);
    }).catch(() => {});
  }, []);

  const { messages, connected, streaming, send } = useZeroClawWs(config);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
  };

  // Not configured
  if (!config) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
        <Bot className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Configure ZeroClaw connection in Settings &gt; Data Sources</p>
      </div>
    );
  }

  /* Small: status only */
  if (size === 'small') {
    const lastMsg = messages[messages.length - 1];
    return (
      <div className="flex flex-col h-full justify-center gap-1.5">
        <div className="flex items-center gap-1.5">
          {connected ? <Circle className="w-2.5 h-2.5 text-success fill-success" /> : <Circle className="w-2.5 h-2.5 text-destructive fill-destructive" />}
          <span className="text-[0.65rem] font-medium">{connected ? 'Connected' : 'Offline'}</span>
        </div>
        {lastMsg && (
          <p className="text-[0.6rem] text-muted-foreground line-clamp-2">{lastMsg.content.slice(0, 80)}</p>
        )}
        {streaming && <p className="text-[0.6rem] text-primary animate-pulse truncate">{streaming.slice(-60)}</p>}
      </div>
    );
  }

  /* Medium / Large: chat interface */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-1.5 mb-1 shrink-0">
        {connected ? <Circle className="w-2 h-2 text-success fill-success" /> : <Circle className="w-2 h-2 text-destructive fill-destructive" />}
        <span className="text-[0.6rem] text-muted-foreground">{connected ? 'Connected' : 'Offline'}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-1 mb-1.5">
        {messages.length === 0 && !streaming && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">Send a message to start</div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} large={size === 'large'} />)}
        {streaming && (
          <div className="px-2 py-1 text-xs text-foreground/80 bg-muted rounded-md max-w-[85%]">
            {streaming}<span className="animate-pulse">|</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-1.5 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={connected ? 'Message ZeroClaw...' : 'Not connected'}
          disabled={!connected}
          className="h-7 text-xs"
        />
        <button onClick={handleSend} disabled={!connected || !input.trim()}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ msg, large }: { msg: ZCMessage; large: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="px-2 py-1 text-xs bg-primary/15 text-foreground rounded-md max-w-[85%]">{msg.content}</div>
      </div>
    );
  }

  if (msg.role === 'assistant') {
    return (
      <div className="px-2 py-1 text-xs text-foreground/80 bg-muted rounded-md max-w-[85%] whitespace-pre-wrap">{msg.content}</div>
    );
  }

  if (msg.role === 'tool_call' || msg.role === 'tool_result') {
    const isCall = msg.role === 'tool_call';
    return (
      <div className="max-w-[90%]">
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[0.6rem] text-muted-foreground hover:text-foreground cursor-pointer">
          {isCall ? <Wrench className="w-3 h-3 text-warning" /> : <CheckCircle className="w-3 h-3 text-success" />}
          <span className="font-medium">{msg.toolName || (isCall ? 'Tool call' : 'Result')}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {expanded && large && (
          <pre className="text-[0.55rem] text-muted-foreground bg-background p-1.5 rounded mt-0.5 overflow-x-auto max-h-24">{msg.content.slice(0, 500)}</pre>
        )}
      </div>
    );
  }

  // system
  return (
    <div className="text-[0.6rem] text-muted-foreground italic text-center flex items-center justify-center gap-1">
      <AlertCircle className="w-3 h-3" />{msg.content}
    </div>
  );
}
