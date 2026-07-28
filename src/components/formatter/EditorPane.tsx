import { useEffect, useMemo, useRef } from 'react';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, Decoration } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { json as jsonLang } from '@codemirror/lang-json';
import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import type { JsonError } from '@lib/json/types';
import {
  selectAllKeymap,
  selectionHighlightField,
  useNativeCopySelection,
  useSyncExternalValue,
} from './codemirror-shared';

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
  '.cm-gutters': { fontSize: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px' },
  '.cm-placeholder': { color: 'rgb(var(--subtle))', fontStyle: 'italic' },
});

export function EditorPane({ value, onChange, error, ariaLabel }: Props): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;
  valueRef.current = value;

  const extensions = useMemo(
    () => [
      lineNumbers(),
      history(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      jsonLang(),
      errorField,
      selectionHighlightField,
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
    ],
    [ariaLabel],
  );

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let retryTimer: NodeJS.Timeout | null = null;

    timer = setTimeout(() => {
      if (!hostRef.current) return;
      if (viewRef.current) return;

      try {
        const currentValue = valueRef.current;
        const view = new EditorView({
          state: EditorState.create({ doc: currentValue, extensions }),
          parent: hostRef.current,
        });
        viewRef.current = view;

        if (currentValue === '') {
          retryTimer = setTimeout(() => {
            if (!viewRef.current) return;
            const updatedValue = valueRef.current;
            if (updatedValue !== '') {
              const current = viewRef.current.state.doc.toString();
              if (current === '') {
                viewRef.current.dispatch({
                  changes: { from: 0, to: 0, insert: updatedValue },
                });
              }
            }
          }, 100);
        }
      } catch (err) {
        console.error('Failed to create CodeMirror view:', err);
      }
    }, 300);

    return () => {
      if (timer) clearTimeout(timer);
      if (retryTimer) clearTimeout(retryTimer);
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

  useSyncExternalValue(viewRef, value);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorEffect.of(error) });
  }, [error]);

  useNativeCopySelection(hostRef, viewRef);

  return (
    <div
      ref={hostRef}
      className="h-full w-full bg-surface"
      data-testid="editor-input"
    />
  );
}
