# Testing Strategy

## Test Layers

1. Core unit tests: pivot aggregation, field detection, filters, request serialization, and drilldown matching.
2. React component tests: `DataGrid` rendering, sorting, column visibility, `PivotTable` client drilldown behavior.
3. Accessibility checks: roles, labels, keyboard navigation, and focus management.
4. Visual/regression tests: large dataset scrolling, compact viewports, token override themes, and drilldown panel layout.
5. Package checks: build output, type declarations, CSS export, and `npm pack --dry-run`.

## Current Scripts

```bash
npm run check
npm run typecheck
npm run coverage
npm run build
npm run pack:check
```

Coverage thresholds are configured in `vitest.config.ts`:

- statements: 75%
- branches: 70%
- functions: 75%
- lines: 75%

Latest verified coverage from `npm run release`: 92.53% statements.

## Backend Contract Tests

Every backend-facing change should add fixtures for:

- the outgoing `PivotRequest`;
- the incoming `PivotResult`;
- the outgoing `DrillDownRequest`;
- server-controlled drilldown rows.

These fixtures should stay plain JSON so backend teams can reuse them in API tests.
