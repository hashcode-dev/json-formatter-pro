import React, { useMemo } from 'react';
import { useStore } from '@store/index';
import {
  jsonToYaml,
  jsonToXml,
  jsonToCsv,
  jsonToTypeScript,
  jsonToJsonSchema,
} from '@lib/json/converters';
import { copyToClipboard } from '@lib/clipboard';
import { downloadText } from '@lib/download';

interface Props {
  type: 'yaml' | 'xml' | 'csv' | 'typescript' | 'schema';
}

export const ConvertersPane: React.FC<Props> = ({ type }) => {
  const value = useStore((s) => s.value);
  const pushToast = useStore((s) => s.pushToast);

  const { output, fileExtension, mimeType, label } = useMemo(() => {
    if (value === null) {
      return {
        output: '// Provide a valid JSON payload in the editor to convert.',
        fileExtension: 'txt',
        mimeType: 'text/plain',
        label: 'Output',
      };
    }

    try {
      switch (type) {
        case 'yaml':
          return {
            output: jsonToYaml(value),
            fileExtension: 'yaml',
            mimeType: 'text/yaml',
            label: 'YAML Output',
          };
        case 'xml':
          return {
            output: jsonToXml(value),
            fileExtension: 'xml',
            mimeType: 'application/xml',
            label: 'XML Output',
          };
        case 'csv':
          return {
            output: jsonToCsv(value),
            fileExtension: 'csv',
            mimeType: 'text/csv',
            label: 'CSV Output',
          };
        case 'typescript':
          return {
            output: jsonToTypeScript(value),
            fileExtension: 'ts',
            mimeType: 'text/typescript',
            label: 'TypeScript Interfaces',
          };
        case 'schema':
          return {
            output: jsonToJsonSchema(value),
            fileExtension: 'json',
            mimeType: 'application/json',
            label: 'JSON Schema (Draft-07)',
          };
        default:
          return {
            output: '',
            fileExtension: 'txt',
            mimeType: 'text/plain',
            label: 'Output',
          };
      }
    } catch (err) {
      return {
        output: `// Error converting JSON: ${err instanceof Error ? err.message : String(err)}`,
        fileExtension: 'txt',
        mimeType: 'text/plain',
        label: 'Error',
      };
    }
  }, [value, type]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(output);
    pushToast({
      kind: ok ? 'success' : 'error',
      message: ok ? `Copied ${label} to clipboard!` : 'Failed to copy to clipboard',
    });
  };

  const handleDownload = () => {
    downloadText(`converted.${fileExtension}`, output, mimeType);
    pushToast({
      kind: 'info',
      message: `Downloaded converted.${fileExtension}`,
    });
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs">
        <span className="font-medium text-subtle">{label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!output || value === null}
            className="btn-ghost py-1 px-2 text-xs"
            title="Copy output"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            disabled={!output || value === null}
            className="btn-ghost py-1 px-2 text-xs"
            title="Download file"
          >
            Download
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="font-mono text-xs text-fg leading-relaxed whitespace-pre-wrap selection:bg-accent/20">
          <code>{output}</code>
        </pre>
      </div>
    </div>
  );
};
