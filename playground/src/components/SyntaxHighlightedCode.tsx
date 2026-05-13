import type { ReactNode } from 'react';

type CodeLanguage = 'css' | 'tsx';

interface SyntaxHighlightedCodeProps {
  code: string;
  language: CodeLanguage;
}

interface TokenRule {
  className: string;
  pattern: RegExp;
}

const tsxRules: TokenRule[] = [
  { className: 'code-token-comment', pattern: /^\/\/.*/ },
  { className: 'code-token-string', pattern: /^(['"`])(?:\\.|(?!\1)[\s\S])*\1/ },
  {
    className: 'code-token-keyword',
    pattern: /^(?:const|let|var|return|import|from|type|interface|export|function|async|await|if|else|true|false|null|undefined|as)\b/,
  },
  { className: 'code-token-component', pattern: /^<\/?[A-Z][A-Za-z0-9.]*/ },
  { className: 'code-token-tag', pattern: /^<\/?[a-z][A-Za-z0-9-]*/ },
  { className: 'code-token-attr', pattern: /^[A-Za-z_$][\w$.-]*(?==)/ },
  { className: 'code-token-number', pattern: /^-?\d+(?:\.\d+)?/ },
  { className: 'code-token-property', pattern: /^[A-Za-z_$][\w$]*(?=\s*:)/ },
];

const cssRules: TokenRule[] = [
  { className: 'code-token-comment', pattern: /^\/\*[\s\S]*?\*\// },
  { className: 'code-token-selector', pattern: /^[.#][A-Za-z0-9_-]+(?=\s*\{)/ },
  { className: 'code-token-variable', pattern: /^--[A-Za-z0-9_-]+/ },
  { className: 'code-token-property', pattern: /^[A-Za-z-]+(?=\s*:)/ },
  { className: 'code-token-string', pattern: /^(['"])(?:\\.|(?!\1)[\s\S])*\1/ },
  { className: 'code-token-number', pattern: /^-?\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ms|s|fr)?/ },
  { className: 'code-token-function', pattern: /^[A-Za-z-]+(?=\()/ },
  { className: 'code-token-color', pattern: /^#[0-9a-fA-F]{3,8}/ },
];

function tokenizeLine(line: string, rules: TokenRule[], lineKey: number): ReactNode[] {
  const tokens: ReactNode[] = [];
  let remaining = line;
  let offset = 0;

  while (remaining.length > 0) {
    const rule = rules.find((candidate) => candidate.pattern.test(remaining));

    if (rule) {
      const value = rule.pattern.exec(remaining)?.[0] ?? '';
      tokens.push(
        <span className={rule.className} key={`${lineKey}-${offset}`}>
          {value}
        </span>,
      );
      remaining = remaining.slice(value.length);
      offset += value.length;
      continue;
    }

    tokens.push(remaining[0]);
    remaining = remaining.slice(1);
    offset += 1;
  }

  return tokens;
}

export function SyntaxHighlightedCode({ code, language }: SyntaxHighlightedCodeProps) {
  const rules = language === 'css' ? cssRules : tsxRules;
  const lines = code.split('\n');
  let lineStart = 0;
  const lineEntries = lines.map((line, index) => {
    const entry = {
      key: `${lineStart}-${line}`,
      line,
      lineStart,
      hasTrailingNewline: index < lines.length - 1,
    };
    lineStart += line.length + 1;
    return entry;
  });

  return (
    <>
      {lineEntries.map((entry) => (
        <span className="code-line" key={entry.key}>
          {tokenizeLine(entry.line, rules, entry.lineStart)}
          {entry.hasTrailingNewline ? '\n' : null}
        </span>
      ))}
    </>
  );
}
