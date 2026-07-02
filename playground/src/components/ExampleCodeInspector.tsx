import { useState } from 'react';

import { getUsageCode, themeCode } from '../codeSamples';
import { Clipboard, Code2 } from '../icons';
import type { ThemeMode, ViewMode } from '../types';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

type CodePanel = 'usage' | 'theme';

interface ExampleCodeInspectorProps {
  view: ViewMode;
  theme: ThemeMode;
}

export function ExampleCodeInspector({ view, theme }: ExampleCodeInspectorProps) {
  const [codePanel, setCodePanel] = useState<CodePanel>('usage');
  const [showCode, setShowCode] = useState(true);
  const [copied, setCopied] = useState(false);

  const activeCode = codePanel === 'theme' ? themeCode[theme] : getUsageCode(view, theme);
  const activeLanguage = codePanel === 'theme' ? 'css' : 'tsx';

  const copyActiveCode = async () => {
    await navigator.clipboard.writeText(activeCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="example-inspector" aria-label="Example code">
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">Example implementation</span>
          <h2>Code used by this playground</h2>
        </div>
        <div className="inspector-actions">
          <button className="inspector-button" type="button" onClick={() => setShowCode((current) => !current)}>
            <Code2 aria-hidden />
            {showCode ? 'Hide code' : 'Show code'}
          </button>
          <button className="inspector-button" type="button" onClick={copyActiveCode}>
            <Clipboard aria-hidden />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {showCode ? (
        <div className="code-viewer">
          <div className="code-tabs" role="tablist" aria-label="Code panel">
            <button
              type="button"
              role="tab"
              aria-selected={codePanel === 'usage'}
              className={codePanel === 'usage' ? 'active' : ''}
              onClick={() => setCodePanel('usage')}
            >
              Usage code
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={codePanel === 'theme'}
              className={codePanel === 'theme' ? 'active' : ''}
              onClick={() => setCodePanel('theme')}
            >
              Theme CSS
            </button>
          </div>
          <pre className="code-block">
            <code>
              <SyntaxHighlightedCode code={activeCode} language={activeLanguage} />
            </code>
          </pre>
        </div>
      ) : null}
    </section>
  );
}
