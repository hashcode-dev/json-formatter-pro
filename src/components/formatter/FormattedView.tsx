import { useEffect, useMemo, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, drawSelection, keymap } from '@codemirror/view';
import { json as jsonLang } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { selectAll } from '@codemirror/commands';

interface Props {
  value: string;
  ariaLabel: string;
  emptyLabel: string;
}

const theme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '10px 0' },
  '.cm-selectionBackground': { backgroundColor: '#ADD8E6 !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#87CEEB !important' },
});

export function FormattedView({ value, ariaLabel, emptyLabel }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const extensions = useMemo(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const selectAllKeymap = isMac
      ? [{ key: 'Cmd-a', run: selectAll, preventDefault: true }]
      : [{ key: 'Ctrl-a', run: selectAll, preventDefault: true }];

    return [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      lineNumbers(),
      drawSelection(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      jsonLang(),
      theme,
      keymap.of(selectAllKeymap),
      EditorView.contentAttributes.of({
        'aria-label': ariaLabel,
        'aria-multiline': 'true',
        'aria-readonly': 'true',
        role: 'textbox',
      }),
    ];
  }, [ariaLabel]);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({ doc: value, extensions }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Handle native copy for selected text in read-only view
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      const selectedText = view.state.doc.sliceString(selection.from, selection.to);
      e.clipboardData?.setData('text/plain', selectedText);
      e.preventDefault();
    };

    const hostElement = hostRef.current;
    if (hostElement) {
      hostElement.addEventListener('copy', handleCopy);
      return () => hostElement.removeEventListener('copy', handleCopy);
    }
  }, []);

  const isEmpty = value.length === 0;

  return (
    <div className="relative h-full w-full bg-surface" data-testid="editor-output">
      <div
        ref={hostRef}
        className="h-full w-full"
        aria-hidden={isEmpty ? 'true' : undefined}
      />
      {isEmpty && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface px-6 text-center text-sm text-subtle"
        >
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
