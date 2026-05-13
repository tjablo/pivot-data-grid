const pivotGridTailwindPreset = {
  theme: {
    extend: {
      colors: {
        'pg-bg': 'var(--pg-bg, #f3f4f6)',
        'pg-surface': 'var(--pg-surface, #ffffff)',
        'pg-toolbar': 'var(--pg-toolbar-bg, #ffffff)',
        'pg-border': 'var(--pg-border, #d7dce2)',
        'pg-text': 'var(--pg-text, #1f2328)',
        'pg-muted': 'var(--pg-muted, #667085)',
        'pg-accent': 'var(--pg-accent, #4b5563)',
        'pg-positive': 'var(--pg-positive, #16735f)',
        'pg-negative': 'var(--pg-negative, #b94842)',
      },
      borderRadius: {
        pg: 'var(--pg-radius, 8px)',
      },
      boxShadow: {
        pg: 'var(--pg-shadow, 0 18px 46px rgb(31 35 40 / 10%))',
      },
      fontFamily: {
        pg: 'var(--pg-font-family, Inter, ui-sans-serif, system-ui, sans-serif)',
      },
    },
  },
};

export default pivotGridTailwindPreset;
