import { useEffect, useMemo, useRef } from 'react';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
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
});

export function EditorPane({ value, onChange, error, ariaLabel }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const extensions = useMemo(
    () => [
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
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
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

  return (
    <div
      ref={hostRef}
      className="h-full w-full bg-surface"
      data-testid="editor-input"
    />
  );
}
