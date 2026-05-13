export type ViewMode = 'client' | 'server' | 'grid';
export type ThemeMode = 'default' | 'finance' | 'dark';

export interface PlaygroundOption<TValue extends string> {
  value: TValue;
  label: string;
}
