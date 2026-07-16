import { useEffect, useMemo, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, drawSelection } from '@codemirror/view';
import { json as jsonLang } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';

interface Props {
  value: string;
  ariaLabel: string;
  emptyLabel: string;
}

const theme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { padding: '10px 0' },
});

export function FormattedView({ value, ariaLabel, emptyLabel }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const extensions = useMemo(
    () => [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      lineNumbers(),
      drawSelection(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      jsonLang(),
      theme,
      EditorView.contentAttributes.of({
        'aria-label': ariaLabel,
        'aria-readonly': 'true',
        role: 'textbox',
      }),
    ],
    [ariaLabel],
  );

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
