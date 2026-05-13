# Changelog

All notable changes to this project will be documented in this file.

This project follows Semantic Versioning.

## [Unreleased]

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

[Unreleased]: https://github.com/tjablo/pivot-data-grid/compare/v0.1.0-alpha.0...HEAD
[0.1.0-alpha.0]: https://github.com/tjablo/pivot-data-grid/releases/tag/v0.1.0-alpha.0
