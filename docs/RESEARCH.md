# Research and License Review

Research date: 2026-06-26.

## Dependency Licensing

| Library | Use | License status | Source |
| --- | --- | --- | --- |
| React / React DOM | Peer dependency for UI rendering | MIT | https://www.npmjs.com/package/react |
| TanStack Virtual | Row and column virtualization | MIT | https://www.npmjs.com/package/%40tanstack/react-virtual |
| Radix UI Dropdown Menu | Accessible column visibility menu primitive | MIT | https://github.com/radix-ui/primitives/blob/main/LICENSE |
| Radix UI Popover | Date picker popover primitive | MIT | https://github.com/radix-ui/primitives/blob/main/LICENSE |
| Radix UI Select | Accessible non-native select controls | MIT | https://github.com/radix-ui/primitives/blob/main/LICENSE |
| Feather icon paths | Embedded control and action icon paths adapted from Feather Icons, plus a project-authored list-filter icon | MIT | https://github.com/feathericons/feather/blob/master/LICENSE |
| clsx | Class name composition | MIT | https://www.npmjs.com/package/clsx |
| Tailwind CSS | Optional consumer styling bridge, not runtime dependency | MIT | https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE |
| Vitest / coverage-v8 | Tests and coverage | MIT | https://www.npmjs.com/package/vitest |
| tsup | Library build output | MIT | https://www.npmjs.com/package/tsup |

Conclusion: the selected runtime libraries are permissive and compatible with an MIT open-source npm package. Keep `react` and `react-dom` as peer dependencies to avoid bundling duplicate React copies.

## Styling Best Practices

Sources reviewed:

- Tailwind theme variables: https://tailwindcss.com/docs/theme
- Radix styling guide: https://www.radix-ui.com/primitives/docs/guides/styling
- web.dev custom properties: https://web.dev/learn/css/custom-properties
- web.dev theming: https://web.dev/learn/design/theming

Findings:

- CSS custom properties are the right external styling API for a reusable grid because they inherit through wrapper elements and can map to host app tokens.
- Low-level primitives like Radix are useful because they are unstyled and expose state via attributes, leaving presentation to the package CSS or consumer CSS.
- Tailwind should be optional. Shipping compiled CSS variables and a Tailwind preset gives Tailwind users a bridge without forcing all users into Tailwind build configuration.
- Stable class names are still useful for fine-grained overrides, but token overrides should be the primary customization path.
- Theming docs from mature grids show a useful pattern: expose common visual decisions as variables and warn that deep DOM selectors are more brittle than token-level overrides.

## Data Grid Practices

Sources reviewed:

- TanStack Virtual package/docs: https://www.npmjs.com/package/%40tanstack/react-virtual
- WAI-ARIA grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/

Findings:

- Headless or mostly headless logic keeps state, data processing, and rendering concerns separable.
- Virtualization needs to be centralized in one grid renderer so pivot rows and drilldown rows behave consistently.
- Interactive data grids should follow the WAI-ARIA grid pattern. The MVP uses roles and semantic structure; full roving focus and keyboard navigation remain a roadmap item before a stable `1.0.0`.

## NPM Packaging Practices

Sources reviewed:

- npm `package.json` docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- tsup package docs: https://www.npmjs.com/package/tsup

Findings:

- Use `exports` to define public entry points and keep internals private.
- Publish ESM, CJS, and `.d.ts` files.
- Use `files` to keep the npm tarball small.
- Mark CSS as a side effect so bundlers do not remove it accidentally.
- Keep package install verification with `npm pack --dry-run`.
