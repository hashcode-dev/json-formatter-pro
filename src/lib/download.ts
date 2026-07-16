export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after download completes. Safari needs longer timeout to avoid cancellation.
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => URL.revokeObjectURL(url));
  } else {
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
