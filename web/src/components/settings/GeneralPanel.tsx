import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface Props {
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function GeneralPanel({ onToast }: Props) {
  const [refreshInterval, setRefreshInterval] = useState(
    () => localStorage.getItem('pulse-refresh-interval') || '60'
  );
  const [theme] = useState('dark');

  const handleSaveRefresh = () => {
    localStorage.setItem('pulse-refresh-interval', refreshInterval);
    onToast('Refresh interval saved', 'success');
  };

  const handleResetLayout = () => {
    localStorage.removeItem('dashboard-layout-v2');
    onToast('Dashboard layout reset. Reload the page to apply.', 'success');
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">General</h2>
      <p className="text-sm text-muted-foreground mb-6">Dashboard appearance and behavior.</p>

      <div className="space-y-6">
        {/* Theme */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Theme</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Dashboard color scheme</p>
              </div>
              <select
                value={theme}
                disabled
                className="h-8 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground"
              >
                <option value="dark">Dark</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Refresh Interval */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Widget Refresh Interval</h3>
                <p className="text-xs text-muted-foreground mt-0.5">How often widgets fetch new data (seconds)</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="h-8 w-20 rounded-md border border-input bg-transparent px-3 text-sm text-foreground text-right"
                />
                <Button variant="outline" size="sm" onClick={handleSaveRefresh}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Layout */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Dashboard Layout</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Reset widget positions to default</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetLayout}>Reset Layout</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
