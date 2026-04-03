import NewsFeed from './widgets/NewsFeed';
import CollectorStatus from './widgets/CollectorStatus';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>Pulse</h1>
          <span className="header-subtitle">Personal Intelligence Dashboard</span>
        </div>
      </header>
      <main className="dashboard-grid">
        <div className="grid-main">
          <NewsFeed />
        </div>
        <div className="grid-sidebar">
          <CollectorStatus />
        </div>
      </main>
    </div>
  );
}
