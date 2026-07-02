import { createIcon } from '../../src/react/icons';

export { Check, ChevronDown } from '../../src/react/icons';

export const Clipboard = createIcon('Clipboard', [
  ['path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', key: 'feather-clipboard-frame' }],
  ['rect', { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1', key: 'feather-clipboard-clip' }],
]);

export const Code2 = createIcon('Code2', [
  ['polyline', { points: '16 18 22 12 16 6', key: 'feather-code-right' }],
  ['polyline', { points: '8 6 2 12 8 18', key: 'feather-code-left' }],
]);

export const Globe2 = createIcon('Globe2', [
  ['circle', { cx: '12', cy: '12', r: '10', key: 'feather-globe-circle' }],
  ['line', { x1: '2', y1: '12', x2: '22', y2: '12', key: 'feather-globe-equator' }],
  [
    'path',
    { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z', key: 'feather-globe-meridian' },
  ],
]);

export const Package = createIcon('Package', [
  ['line', { x1: '16.5', y1: '9.4', x2: '7.5', y2: '4.21', key: 'feather-package-top-edge' }],
  [
    'path',
    {
      d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
      key: 'feather-package-box',
    },
  ],
  ['polyline', { points: '3.27 6.96 12 12.01 20.73 6.96', key: 'feather-package-front-fold' }],
  ['line', { x1: '12', y1: '22.08', x2: '12', y2: '12', key: 'feather-package-center-edge' }],
]);
