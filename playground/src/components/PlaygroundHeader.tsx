import type { PlaygroundOption, ThemeMode, ViewMode } from '../types';
import { PlaygroundSelect } from './PlaygroundSelect';

const viewOptions: Array<PlaygroundOption<ViewMode>> = [
  { value: 'client', label: 'Client pivot' },
  { value: 'server', label: 'Server mode' },
  { value: 'grid', label: 'Data grid' },
];

const themeOptions: Array<PlaygroundOption<ThemeMode>> = [
  { value: 'default', label: 'Default' },
  { value: 'finance', label: 'Finance' },
  { value: 'dark', label: 'Dark' },
];

interface PlaygroundHeaderProps {
  orderCount: number;
  view: ViewMode;
  theme: ThemeMode;
  onViewChange: (view: ViewMode) => void;
  onThemeChange: (theme: ThemeMode) => void;
}

export function PlaygroundHeader({ orderCount, view, theme, onViewChange, onThemeChange }: PlaygroundHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1>Pivot Grid Table</h1>
        <p>{orderCount.toLocaleString('en-US')} sample orders</p>
      </div>

      <div className="header-controls" role="group" aria-label="Playground controls">
        <div className="segmented" role="group" aria-label="View mode">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={view === option.value ? 'active' : ''}
              onClick={() => onViewChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <PlaygroundSelect label="Theme" value={theme} options={themeOptions} onValueChange={onThemeChange} />
      </div>
    </header>
  );
}
