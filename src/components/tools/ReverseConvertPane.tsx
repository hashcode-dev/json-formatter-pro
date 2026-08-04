import React, { useMemo } from 'react';
import { useStore } from '@store/index';
import type { OutputMode } from '@store/index';
import type { IndentOption } from '@lib/json/types';
import {
  csvToJson,
  yamlToJson,
  xmlToJson,
  type ReverseConvertResult,
} from '@lib/json/reverse-converters';
import { detectInputFormat, INPUT_FORMATS, type InputFormatId } from '@components/formatter/input-formats';
import { FormattedView } from '@components/formatter/FormattedView';
import { downloadText } from '@lib/download';
import { useCopyWithToast } from '@hooks/useCopyWithToast';

interface ReverseConverter {
  run: (raw: string, options: { indent: IndentOption }) => ReverseConvertResult;
  /** Which input format this mode expects — also the pill/label wording. */
  source: InputFormatId;
  label: string;
}

export type ReverseConverterMode = 'csvToJson' | 'yamlToJson' | 'xmlToJson';

/**
 * The mirror image of CONVERTERS in ConvertersPane: source format in the editor,
 * JSON in the output pane.
 */
const REVERSE_CONVERTERS: Record<ReverseConverterMode, ReverseConverter> = {
  csvToJson: { run: csvToJson, source: 'csv', label: 'JSON from CSV' },
  yamlToJson: { run: yamlToJson, source: 'yaml', label: 'JSON from YAML' },
  xmlToJson: { run: xmlToJson, source: 'xml', label: 'JSON from XML' },
};

export function isReverseConverterMode(mode: OutputMode): mode is ReverseConverterMode {
  return mode in REVERSE_CONVERTERS;
}

/**
 * Runs the converter for a mode. Shared with FormatterApp so Copy/Download in
 * the toolbar act on the JSON shown here rather than on the source text.
 */
export function reverseConvert(
  mode: ReverseConverterMode,
  raw: string,
  indent: IndentOption,
): ReverseConvertResult {
  return REVERSE_CONVERTERS[mode].run(raw, { indent });
}

interface Props {
  type: ReverseConverterMode;
}

export const ReverseConvertPane: React.FC<Props> = ({ type }) => {
  const input = useStore((s) => s.input);
  const indent = useStore((s) => s.options.indent);
  const pushToast = useStore((s) => s.pushToast);
  const copyWithToast = useCopyWithToast();

  const { source, label } = REVERSE_CONVERTERS[type];
  const sourceLabel = INPUT_FORMATS[source].label;

  const result = useMemo(() => reverseConvert(type, input, indent), [type, input, indent]);

  // The tool tabs can be switched without changing the input, so the editor may
  // still hold another format's document (JSON picked up from a converter page,
  // say). Saying so beats rendering a confusing parse error for content the
  // user never meant to convert.
  const wrongFormat = useMemo(() => {
    const detected = detectInputFormat(input);
    return detected !== null && detected !== source ? INPUT_FORMATS[detected].label : null;
  }, [input, source]);

  const output = result.ok ? result.json : '';

  const handleCopy = () =>
    void copyWithToast(output, {
      success: `Copied ${label} to clipboard!`,
      error: 'Failed to copy to clipboard',
    });

  const handleDownload = () => {
    downloadText('converted.json', output, 'application/json');
    pushToast({ kind: 'info', message: 'Downloaded converted.json' });
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs">
        <span className="font-medium text-subtle">{label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!output}
            className="btn-ghost py-1 px-2 text-xs"
            title="Copy JSON output"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            disabled={!output}
            className="btn-ghost py-1 px-2 text-xs"
            title="Download converted.json"
          >
            Download
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {result.ok ? (
          <FormattedView
            value={result.json}
            ariaLabel={`JSON converted from ${sourceLabel}`}
            emptyLabel={`Paste ${sourceLabel} in the input pane to convert it to JSON.`}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium text-fg">
              {wrongFormat
                ? `That looks like ${wrongFormat}, not ${sourceLabel}`
                : `Waiting for valid ${sourceLabel}`}
            </p>
            <p className="max-w-sm text-xs text-subtle">
              {wrongFormat
                ? `Paste ${sourceLabel} into the input pane to convert it to JSON.`
                : result.error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
