import { createElement, type ForwardRefExoticComponent, forwardRef, type RefAttributes, type SVGProps } from 'react';

type IconElementName = 'circle' | 'line' | 'path' | 'polyline' | 'rect';
type IconNode = readonly (readonly [IconElementName, Record<string, string>])[];
type IconProps = Omit<SVGProps<SVGSVGElement>, 'ref'> & {
  size?: string | number;
  absoluteStrokeWidth?: boolean;
};
type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

// Most SVG path data is adapted from Feather Icons. See docs/THIRD_PARTY_NOTICES.md.
function mergeClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function createIcon(displayName: string, iconNode: IconNode): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth, className, children, ...props }, ref) => {
      const numericSize = Number(size);
      const numericStrokeWidth = Number(strokeWidth);
      const resolvedStrokeWidth =
        absoluteStrokeWidth && Number.isFinite(numericSize) && Number.isFinite(numericStrokeWidth)
          ? (numericStrokeWidth * 24) / numericSize
          : strokeWidth;

      return createElement(
        'svg',
        {
          ref,
          xmlns: 'http://www.w3.org/2000/svg',
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: color,
          strokeWidth: resolvedStrokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          className: mergeClasses('pg-svg-icon', className),
          ...props,
        },
        ...iconNode.map(([tag, attrs]) => createElement(tag, attrs)),
        children,
      );
    },
  );
  Icon.displayName = displayName;
  return Icon;
}

export const ArrowDown = createIcon('ArrowDown', [
  ['line', { x1: '12', y1: '5', x2: '12', y2: '19', key: 'feather-arrow-down-line' }],
  ['polyline', { points: '19 12 12 19 5 12', key: 'feather-arrow-down-head' }],
]);

export const ArrowLeft = createIcon('ArrowLeft', [
  ['line', { x1: '19', y1: '12', x2: '5', y2: '12', key: 'feather-arrow-left-line' }],
  ['polyline', { points: '12 19 5 12 12 5', key: 'feather-arrow-left-head' }],
]);

export const ArrowUp = createIcon('ArrowUp', [
  ['line', { x1: '12', y1: '19', x2: '12', y2: '5', key: 'feather-arrow-up-line' }],
  ['polyline', { points: '5 12 12 5 19 12', key: 'feather-arrow-up-head' }],
]);

export const CalendarDays = createIcon('CalendarDays', [
  ['rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2', key: 'feather-calendar-frame' }],
  ['line', { x1: '16', y1: '2', x2: '16', y2: '6', key: 'feather-calendar-right-ring' }],
  ['line', { x1: '8', y1: '2', x2: '8', y2: '6', key: 'feather-calendar-left-ring' }],
  ['line', { x1: '3', y1: '10', x2: '21', y2: '10', key: 'feather-calendar-divider' }],
]);

export const Check = createIcon('Check', [['polyline', { points: '20 6 9 17 4 12', key: 'feather-check' }]]);

export const ChevronDown = createIcon('ChevronDown', [['polyline', { points: '6 9 12 15 18 9', key: 'feather-chevron-down' }]]);

export const ChevronLeft = createIcon('ChevronLeft', [['polyline', { points: '15 18 9 12 15 6', key: 'feather-chevron-left' }]]);

export const ChevronRight = createIcon('ChevronRight', [['polyline', { points: '9 18 15 12 9 6', key: 'feather-chevron-right' }]]);

export const Copy = createIcon('Copy', [
  ['rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2', key: 'feather-copy-front' }],
  ['path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1', key: 'feather-copy-back' }],
]);

export const ListFilter = createIcon('ListFilter', [
  ['line', { x1: '4', y1: '6', x2: '20', y2: '6', key: 'local-list-filter-wide' }],
  ['line', { x1: '8', y1: '12', x2: '16', y2: '12', key: 'local-list-filter-mid' }],
  ['line', { x1: '11', y1: '18', x2: '13', y2: '18', key: 'local-list-filter-narrow' }],
]);

export const Plus = createIcon('Plus', [
  ['line', { x1: '12', y1: '5', x2: '12', y2: '19', key: 'feather-plus-vertical' }],
  ['line', { x1: '5', y1: '12', x2: '19', y2: '12', key: 'feather-plus-horizontal' }],
]);

export const Trash2 = createIcon('Trash2', [
  ['polyline', { points: '3 6 5 6 21 6', key: 'feather-trash-top' }],
  ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', key: 'feather-trash-body' }],
  ['line', { x1: '10', y1: '11', x2: '10', y2: '17', key: 'feather-trash-left-line' }],
  ['line', { x1: '14', y1: '11', x2: '14', y2: '17', key: 'feather-trash-right-line' }],
]);

export const X = createIcon('X', [
  ['line', { x1: '18', y1: '6', x2: '6', y2: '18', key: 'feather-x-left' }],
  ['line', { x1: '6', y1: '6', x2: '18', y2: '18', key: 'feather-x-right' }],
]);
