# Styling Strategy

## Decision

The package ships a small vanilla CSS file and exposes design tokens as CSS custom properties. Tailwind is supported through an optional preset, but Tailwind is not required to consume the package.

This avoids forcing consumers to compile our Tailwind classes or adopt a CSS-in-JS runtime.

## Token Contract

All public style tokens use the `--pg-*` prefix:

```css
.my-grid-theme {
  --pg-bg: var(--app-bg);
  --pg-surface: var(--panel);
  --pg-border: var(--border);
  --pg-text: var(--text);
  --pg-muted: var(--text-muted);
  --pg-accent: var(--brand);
  --pg-toolbar-bg: var(--toolbar);
  --pg-positive: var(--success);
  --pg-negative: var(--danger);
  --pg-radius: 6px;
  --pg-font-family: var(--font-sans);
}
```

Apply the class to a wrapper around `PivotTable`/`DataGrid`, pass it as `className` to `PivotTable`, or target `.finance-grid .pg-root`. CSS variables inherit, so one app can run multiple differently themed grids on the same page.

## Component Classes

The CSS also exposes stable class names for targeted overrides:

- `.pg-root`
- `.pg-toolbar`
- `.pg-data-grid`
- `.pg-grid-header-cell`
- `.pg-grid-cell`
- `.pg-grid-cell-tone-positive`
- `.pg-grid-cell-tone-negative`
- `.pg-grid-cell-tone-neutral`
- `.pg-copy-button`
- `.pg-metric-cell`
- `.pg-date-picker`
- `.pg-date-picker-content`
- `.pg-filter-menu-content`
- `.pg-filter-row`
- `.pg-pagination`
- `.pg-drilldown`

Prefer token overrides first. Use class overrides for layout or very specific product requirements.

## Tailwind

The optional preset maps Tailwind theme values to the same CSS variables:

```js
import pivotGridPreset from 'pivot-grid-table/tailwind-preset';

export default {
  presets: [pivotGridPreset],
};
```

Then use values such as `bg-pg-surface`, `bg-pg-toolbar`, `text-pg-text`, `text-pg-positive`, `text-pg-negative`, `border-pg-border`, and `font-pg` in adjacent app UI.

## Good Practices

- Keep defaults neutral and low-specificity.
- Do not use inline colors in React components.
- Prefix every token to avoid collisions with host apps.
- Keep functional layout styles in the package CSS; expose visual decisions through variables.
- Document any new token in this file and add a visual or DOM test when it affects layout.
