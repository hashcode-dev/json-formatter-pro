import React, { useMemo } from 'react';
import { useStore } from '@store/index';
import type { OutputMode } from '@store/index';
import type { JsonValue } from '@lib/json/types';
import {
  jsonToYaml,
  jsonToXml,
  jsonToCsv,
  jsonToTypeScript,
  jsonToJsonSchema,
} from '@lib/json/converters';
import { jsonToPython, jsonToJava, jsonToGo } from '@lib/json/codegen';
import { downloadText } from '@lib/download';
import { useCopyWithToast } from '@hooks/useCopyWithToast';

interface Converter {
  run: (value: JsonValue) => string;
  ext: string;
  mime: string;
  label: string;
}

/** Note: `ext` deliberately differs from the key for typescript and schema. */
const CONVERTERS = {
  yaml: { run: jsonToYaml, ext: 'yaml', mime: 'text/yaml', label: 'YAML Output' },
  xml: { run: jsonToXml, ext: 'xml', mime: 'application/xml', label: 'XML Output' },
  csv: { run: jsonToCsv, ext: 'csv', mime: 'text/csv', label: 'CSV Output' },
  typescript: {
    run: jsonToTypeScript,
    ext: 'ts',
    mime: 'text/typescript',
    label: 'TypeScript Interfaces',
  },
  python: {
    run: jsonToPython,
    ext: 'py',
    mime: 'text/x-python',
    label: 'Python Dataclasses',
  },
  java: {
    run: jsonToJava,
    ext: 'java',
    mime: 'text/x-java',
    label: 'Java POJO Classes',
  },
  go: {
    run: jsonToGo,
    ext: 'go',
    mime: 'text/x-go',
    label: 'Go Structs',
  },
  schema: {
    run: jsonToJsonSchema,
    ext: 'json',
    mime: 'application/json',
    label: 'JSON Schema (Draft-07)',
  },
} satisfies Record<string, Converter>;

export type ConverterMode = keyof typeof CONVERTERS;

export function isConverterMode(mode: OutputMode): mode is ConverterMode {
  return mode in CONVERTERS;
}

const PLACEHOLDER: Omit<Converter, 'run'> & { output: string } = {
  output: '// Provide a valid JSON payload in the editor to convert.',
  ext: 'txt',
  mime: 'text/plain',
  label: 'Output',
};

interface Props {
  type: ConverterMode;
}

export const ConvertersPane: React.FC<Props> = ({ type }) => {
  const value = useStore((s) => s.value);
  const pushToast = useStore((s) => s.pushToast);
  const copyWithToast = useCopyWithToast();

  const { output, ext, mime, label } = useMemo(() => {
    const converter = CONVERTERS[type];
    if (value === null || !converter) return PLACEHOLDER;
    const { run, ...meta } = converter;
    try {
      return { ...meta, output: run(value) };
    } catch (err) {
      return {
        ...PLACEHOLDER,
        output: `// Error converting JSON: ${err instanceof Error ? err.message : String(err)}`,
        label: 'Error',
      };
    }
  }, [value, type]);

  const handleCopy = () =>
    void copyWithToast(output, {
      success: `Copied ${label} to clipboard!`,
      error: 'Failed to copy to clipboard',
    });

  const handleDownload = () => {
    downloadText(`converted.${ext}`, output, mime);
    pushToast({ kind: 'info', message: `Downloaded converted.${ext}` });
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
