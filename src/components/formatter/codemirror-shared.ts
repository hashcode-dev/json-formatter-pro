import { useEffect } from 'react';
import { StateField } from '@codemirror/state';
import type { Range } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { selectAll } from '@codemirror/commands';
import { isMac } from '@lib/shortcuts';

type Ref<T> = { current: T | null };

const selectionHighlight = Decoration.mark({ class: 'cm-selection-highlight' });

function highlightRanges(state: { selection: { ranges: readonly { from: number; to: number; empty: boolean }[] } }): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  for (const range of state.selection.ranges) {
    if (!range.empty) decorations.push(selectionHighlight.range(range.from, range.to));
  }
  return decorations;
}

/**
 * Paints a background over non-empty selections. Both editor panes use one
 * definition; a field's value lives in the EditorState, so sharing is safe.
 */
export const selectionHighlightField = StateField.define<DecorationSet>({
  create: (state) => Decoration.set(highlightRanges(state)),
  update: (_deco, tr) => Decoration.set(highlightRanges(tr.state)),
  provide: (f) => EditorView.decorations.from(f),
});

/** Select-all bound to the platform's own modifier. */
export const selectAllKeymap = isMac
  ? [{ key: 'Cmd-a', run: selectAll, preventDefault: true }]
  : [{ key: 'Ctrl-a', run: selectAll, preventDefault: true }];

/**
 * Serve native copy from the CodeMirror selection. Without this the browser
 * copies nothing, because the visible text lives in CodeMirror's own state.
 */
export function useNativeCopySelection(
  hostRef: Ref<HTMLElement>,
  viewRef: Ref<EditorView>,
): void {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      if (selection.empty) return;
      e.clipboardData?.setData(
        'text/plain',
        view.state.doc.sliceString(selection.from, selection.to),
      );
      e.preventDefault();
    };

    const hostElement = hostRef.current;
    if (!hostElement) return;
    hostElement.addEventListener('copy', handleCopy);
    return () => hostElement.removeEventListener('copy', handleCopy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Push an external value into the document. The equality check is what stops it
 * from stomping whatever the user is currently typing.
 *
 * Must be called after the effect that creates the view, so that viewRef is
 * populated by the time this one runs.
 */
export function useSyncExternalValue(viewRef: Ref<EditorView>, value: string): void {
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
