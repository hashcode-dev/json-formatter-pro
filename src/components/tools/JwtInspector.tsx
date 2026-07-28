import React, { useMemo } from 'react';
import { useStore } from '@store/index';
import { parseJwt } from '@lib/json/jwt';
import { useCopyWithToast } from '@hooks/useCopyWithToast';

export const JwtInspector: React.FC = () => {
  const input = useStore((s) => s.input);
  const copyWithToast = useCopyWithToast();

  const result = useMemo(() => parseJwt(input), [input]);

  /** `raw` is passed explicitly: a payload can itself decode to a bare string. */
  const copySection = (raw: string, title: string) =>
    void copyWithToast(raw, {
      success: `Copied ${title} to clipboard`,
      error: 'Failed to copy',
    });

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

  const headerJson = JSON.stringify(result.header, null, 2);
  const payloadJson = JSON.stringify(result.payload, null, 2);
  const signature = result.signature ?? '';

  return (
    <div className="flex h-full flex-col bg-surface overflow-auto p-4 space-y-4">
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

      <Section
        title="HEADER: ALGORITHM & TOKEN TYPE"
        titleClass="text-purple-400"
        onCopy={() => copySection(headerJson, 'Header')}
      >
        <pre className="p-3 font-mono text-xs text-fg leading-relaxed overflow-x-auto">
          {headerJson}
        </pre>
      </Section>

      <Section
        title="PAYLOAD: DATA CLAIMS"
        titleClass="text-blue-400"
        onCopy={() => copySection(payloadJson, 'Payload')}
      >
        <pre className="p-3 font-mono text-xs text-fg leading-relaxed overflow-x-auto">
          {payloadJson}
        </pre>
      </Section>

      <Section
        title="VERIFY SIGNATURE"
        titleClass="text-emerald-400"
        onCopy={() => copySection(signature, 'Signature')}
      >
        <div className="p-3 font-mono text-xs text-subtle break-all">{signature}</div>
      </Section>
    </div>
  );
};

function Section({
  title,
  titleClass,
  onCopy,
  children,
}: {
  title: string;
  titleClass: string;
  onCopy: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-bg/30">
      <div
        className={`flex items-center justify-between border-b border-border px-3 py-2 text-xs font-medium ${titleClass}`}
      >
        <span>{title}</span>
        <button onClick={onCopy} className="btn-ghost py-0.5 px-2 text-xs">
          Copy
        </button>
      </div>
      {children}
    </div>
  );
}
