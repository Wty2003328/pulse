import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cpu } from 'lucide-react';
import { PROVIDERS } from '../lib/providers';
import { ProviderCard } from './settings/ProviderCard';
import type { ProviderSetting } from '../types';

export default function Settings() {
  const [providers, setProviders] = useState<ProviderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/settings/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers);
      }
    } catch {
      // API may not exist yet, use empty defaults
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const getProviderSetting = (id: string): ProviderSetting | undefined => {
    return providers.find((p) => p.id === id);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-4 bg-card border-b border-border">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Settings</h1>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">AI Providers</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure API keys for AI providers that power the intelligence pipeline.
            Set one provider as active to enable AI-powered scoring, summarization, and tagging.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {PROVIDERS.map((meta) => (
              <ProviderCard
                key={meta.id}
                meta={meta}
                setting={getProviderSetting(meta.id)}
                onSaved={fetchProviders}
                onToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4 ${
          toast.type === 'success'
            ? 'bg-success/15 text-success border border-success/30'
            : 'bg-destructive/15 text-destructive border border-destructive/30'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
