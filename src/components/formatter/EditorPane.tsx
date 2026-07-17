import { useEffect, useMemo, useRef } from 'react';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, selectAll } from '@codemirror/commands';
import { json as jsonLang } from '@codemirror/lang-json';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import type { JsonError } from '@lib/json/types';

interface Props {
  value: string;
  onChange: (next: string) => void;
  error: JsonError | null;
  ariaLabel: string;
}

const setErrorEffect = StateEffect.define<JsonError | null>();

const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const eff of tr.effects) {
      if (eff.is(setErrorEffect)) {
        const err = eff.value;
        if (!err) return Decoration.none;
        const doc = tr.state.doc;
        const line = Math.max(1, Math.min(err.line, doc.lines));
        const info = doc.line(line);
        next = Decoration.set([
          Decoration.line({ class: 'cm-line-error' }).range(info.from),
        ]);
      }
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const baseTheme = EditorView.theme({
  '&': { height: '100%' },
  '.cm-content': { caretColor: 'rgb(var(--fg))', padding: '10px 0' },
  '.cm-gutters': { fontSize: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px' },
  '.cm-placeholder': { color: 'rgb(var(--subtle))', fontStyle: 'italic' },
  '.cm-selectionBackground': { backgroundColor: '#ADD8E6 !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#87CEEB !important' },
});

export function EditorPane({ value, onChange, error, ariaLabel }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const selectAllKeymap = isMac
      ? [{ key: 'Cmd-a', run: selectAll, preventDefault: true }]
      : [{ key: 'Ctrl-a', run: selectAll, preventDefault: true }];

    return [
      lineNumbers(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      jsonLang(),
      errorField,
      baseTheme,
      keymap.of([...selectAllKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          const next = v.state.doc.toString();
          onChangeRef.current(next);
        }
      }),
      EditorView.contentAttributes.of({
        'aria-label': ariaLabel,
        role: 'textbox',
        'aria-multiline': 'true',
        spellcheck: 'false',
        autocapitalize: 'off',
        autocorrect: 'off',
      }),
    ];
  }, [ariaLabel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hostRef.current) return;
      if (viewRef.current) return;

      try {
        const view = new EditorView({
          state: EditorState.create({ doc: value, extensions }),
          parent: hostRef.current,
        });
        viewRef.current = view;
      } catch (err) {
        console.error('Failed to create CodeMirror view:', err);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch (err) {
          console.error('Failed to destroy CodeMirror view:', err);
        }
        viewRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep external value in sync without stomping user typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  // Reflect error into a line decoration.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorEffect.of(error) });
  }, [error]);

  // Handle native copy for selected text
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

  return (
    <div
      ref={hostRef}
      className="h-full w-full bg-surface"
      data-testid="editor-input"
    />
  );
}
