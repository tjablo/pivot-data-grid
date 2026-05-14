export class DataGridBrowserService {
  hasActiveTextSelection(): boolean {
    if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return false;
    return Boolean(window.getSelection()?.toString());
  }

  async copyTextToClipboard(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall through to the textarea fallback for restricted clipboard contexts.
      }
    }

    if (typeof document === 'undefined') return;

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

export const dataGridBrowserService = new DataGridBrowserService();
