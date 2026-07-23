import React, { useMemo } from 'react';
import { useStore } from '@store/index';
import { parseJwt } from '@lib/json/jwt';
import { copyToClipboard } from '@lib/clipboard';

export const JwtInspector: React.FC = () => {
  const input = useStore((s) => s.input);
  const pushToast = useStore((s) => s.pushToast);

  const result = useMemo(() => parseJwt(input), [input]);

  const handleCopySection = async (data: unknown, title: string) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const ok = await copyToClipboard(text);
    pushToast({
      kind: ok ? 'success' : 'error',
      message: ok ? `Copied ${title} to clipboard` : 'Failed to copy',
    });
  };

  if (!result.ok) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-subtle">
        <svg className="mb-3 h-10 w-10 text-subtle/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m11 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-fg mb-1">JWT Inspector & Decoder</p>
        <p className="text-xs max-w-sm">
          {result.error || 'Paste a JWT token (e.g. eyJhbGciOi...) into the input pane to inspect its header, payload, and claims.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface overflow-auto p-4 space-y-4">
      {/* Overview Status Card */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg/50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-subtle">Status</span>
          {result.isExpired !== undefined && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                result.isExpired
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {result.isExpired ? 'Expired Token' : 'Active / Valid Expiry'}
            </span>
          )}
        </div>
        <div className="text-xs text-subtle">
          {result.expiresAt && <div>Expires: {new Date(result.expiresAt).toLocaleString()}</div>}
          {result.issuedAt && <div>Issued At: {new Date(result.issuedAt).toLocaleString()}</div>}
        </div>
      </div>

      {/* Header Section */}
      <div className="rounded-lg border border-border bg-bg/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-purple-400">
          <span>HEADER: ALGORITHM & TOKEN TYPE</span>
          <button
            onClick={() => handleCopySection(result.header, 'Header')}
            className="btn-ghost py-0.5 px-2 text-xs"
          >
            Copy
          </button>
        </div>
        <pre className="p-3 font-mono text-xs text-fg leading-relaxed overflow-x-auto">
          {JSON.stringify(result.header, null, 2)}
        </pre>
      </div>

      {/* Payload Section */}
      <div className="rounded-lg border border-border bg-bg/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-blue-400">
          <span>PAYLOAD: DATA CLAIMS</span>
          <button
            onClick={() => handleCopySection(result.payload, 'Payload')}
            className="btn-ghost py-0.5 px-2 text-xs"
          >
            Copy
          </button>
        </div>
        <pre className="p-3 font-mono text-xs text-fg leading-relaxed overflow-x-auto">
          {JSON.stringify(result.payload, null, 2)}
        </pre>
      </div>

      {/* Signature Section */}
      <div className="rounded-lg border border-border bg-bg/30">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium text-emerald-400">
          <span>VERIFY SIGNATURE</span>
          <button
            onClick={() => handleCopySection(result.signature, 'Signature')}
            className="btn-ghost py-0.5 px-2 text-xs"
          >
            Copy
          </button>
        </div>
        <div className="p-3 font-mono text-xs text-subtle break-all">
          {result.signature}
        </div>
      </div>
    </div>
  );
};
