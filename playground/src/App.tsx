import { useState } from 'react';

import '../../src/styles.css';
import './styles.css';
import { ExampleCodeInspector } from './components/ExampleCodeInspector';
import { PlaygroundHeader } from './components/PlaygroundHeader';
import { createOrders } from './demoData';
import { ClientSidePivotExample } from './examples/ClientSidePivotExample';
import { DataGridExample } from './examples/DataGridExample';
import { ServerSidePivotExample } from './examples/ServerSidePivotExample';
import type { ThemeMode, ViewMode } from './types';

const orders = createOrders();

export function App() {
  const [view, setView] = useState<ViewMode>('client');
  const [theme, setTheme] = useState<ThemeMode>('default');

  return (
    <main className={`playground theme-${theme}`}>
      <PlaygroundHeader orderCount={orders.length} view={view} theme={theme} onViewChange={setView} onThemeChange={setTheme} />

      <section className="workspace">
        {view === 'client' ? <ClientSidePivotExample orders={orders} theme={theme} /> : null}
        {view === 'server' ? <ServerSidePivotExample orders={orders} theme={theme} /> : null}
        {view === 'grid' ? <DataGridExample orders={orders} theme={theme} /> : null}
      </section>

      <ExampleCodeInspector view={view} theme={theme} />
    </main>
  );
}
