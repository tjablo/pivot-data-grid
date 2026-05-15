# Changelog

All notable changes to this project will be documented in this file.

This project follows Semantic Versioning.

## [Unreleased]

## [0.1.0-alpha.3] - 2026-05-15

### Added

- `PivotTable` fields can now define `renderFieldCell` to render custom React content for pivot row field cells, generated pivot column headers, and drilldown source cells, with a `location` argument for context-specific UI.
- `PivotTable` drilldown options now support `renderHeader` for replacing the drilldown header with custom React content, including structured row/column parts and record-count metadata.
- `PivotTable.formatValue` now receives a structured context with the metric kind, generated column id, value aggregation config, field, aggregation, and pivot column metadata.
- Client-side pivot aggregation uses decimal arithmetic for sums, averages, minimums, and maximums, preserving large or high-precision results as decimal strings when a JavaScript number would lose precision.

### Changed

- `PivotTable.formatValue` accepts `number | string | null` metric values so high-precision aggregation results can be displayed without coercion back to unsafe JavaScript numbers.

## [0.1.0-alpha.1] - 2026-05-14

### Added

- Managed backend `getPage` loaders for `PivotTable` pivot pages and drilldown pages, including page state, loading state, total row counts, server sort state, abort signals, and stale-response protection.
- Dedicated client-side and server-side usage guides.
- Values menu controls for adding, editing, and removing multiple value aggregations in one pivot.
- Pivot loading skeletons for initial server loads before a first `PivotResult` exists.
- Generated pivot column sizing through `columnSizing`, including `width`, `minWidth`, and `maxWidth` for row, count, value, total, and loading columns.
- Playground sample data with million-scale decimal values and copyable numeric metrics.

### Changed

- Documented `getPage` as the recommended backend pagination API while keeping controlled `pivotResult` / `drillDown.rows` flows as advanced escape hatches.
- Normalized duplicate value aggregation pairs before client aggregation and backend request creation.
- Removed the pre-release `drillDown.onLoad` shortcut and first-dimension drilldown request fields in favor of `drillDown.getPage` and full `rowValues` / `columnValues` scope.
- Source filter menu edits are deferred until the filter menu closes by default, reducing unnecessary client recomputation and backend requests.
- Included `docs` in the published package so README documentation links resolve from npm.
- Copy feedback now uses the icon state only instead of rendering a separate copied status tooltip.

### Fixed

- Drilldown grids omit scoped row and column dimension fields already shown in the drilldown title.
- Truncated grid headers and cells use an immediate custom tooltip with corrected right-edge positioning.

## [0.1.0-alpha.0] - 2026-05-13

### Added

- Biome linting and formatting scripts in the release gate.
- Backend pagination controls for server-mode `PivotTable` pivot rows and drilldown rows.
- Dedicated type files for `DataGrid` and `PivotTable`, plus hooks for pivot data, drilldown state, and pagination resolution.
- Initial alpha release of `pivot-grid-table`.
- React `PivotTable` with client-side and server-side pivot modes.
- Virtualized `DataGrid` with sorting, pagination, copyable cells, frozen columns, and value tones.
- Source filters, date range filtering, drilldown rows, localization labels, themeable CSS tokens, and Tailwind preset.
- Public playground at https://pivot-data-grid.vercel.app/.

### Changed

- Aligned CI and npm publish safety with the full local release gate.
- Documented the first public release as an alpha flow with npm dist-tags, GitHub tags, release notes, changelog steps, and post-publish verification.
- Scoped `PivotTable` drilldown settings under `drillDown`, including `drillDown.pagination`, and removed the older top-level drilldown props before the first public release.
- Kept pivot pagination under `pagination` and replaced backend `manual` flags with `mode: 'server'` before the first public release.
- Documented the main `PivotTable` props in the README.

### Fixed

[Unreleased]: https://github.com/tjablo/pivot-data-grid/compare/v0.1.0-alpha.3...HEAD
[0.1.0-alpha.3]: https://github.com/tjablo/pivot-data-grid/compare/v0.1.0-alpha.1...v0.1.0-alpha.3
[0.1.0-alpha.1]: https://github.com/tjablo/pivot-data-grid/compare/v0.1.0-alpha.0...v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/tjablo/pivot-data-grid/releases/tag/v0.1.0-alpha.0
