import { COMMENT_MODE_COLLAPSED, COMMENT_MODE_EXPANDED } from "../constants";
import { Store } from "../store";
import { Comment, Id, isComment } from "../types";

/**
 * Manages comment-specific functionality including zoom-based auto-collapse
 */
export class CommentManager {
  private previousZoom: number = -1;
  constructor(private store: Store) {}

  /**
   * Toggle a comment between collapsed and expanded mode
   * @param id The id of the comment to toggle
   */
  public toggleComment(id: Id): void {
    const state = this.store.getState();
    // Effective (features + any pending live update) mode, not the raw
    // stored one - see updateCommentModesForZoom's doc comment for why
    // that distinction matters here too: a comment auto-collapsed by zoom
    // never has its raw `mode` touched, only its live-update overlay.
    const feature = state.getMergedFeature(id);
    if (!feature || !isComment(feature)) return;

    const comment = feature as Comment;

    state.applyLiveUpdate(id, {
      properties: {
        ...comment.properties,
        mode: comment.properties.mode === "collapsed" ? "expanded" : "collapsed"
      }
    } as Partial<Comment>);
  }

  /**
   * Update comment modes based on current zoom level
   * Uses live updates to avoid creating undo/redo history entries
   * @param zoom Current zoom level
   */
  public updateCommentModesForZoom(zoom: number): void {
    if (Math.abs(this.previousZoom - zoom) < 0.0005) return;
    this.previousZoom = zoom;
    const state = this.store.getState();
    const updates: Record<Id, Partial<Comment>> = {};
    Object.keys(state.features).forEach((id) => {
      // Effective (features + any pending live update) mode - NOT
      // state.features[id] directly. Auto-collapse/expand here only ever
      // writes into the live-update overlay (applyLiveUpdates), never back
      // into `features` itself, so the raw feature's `mode` is stuck at
      // whatever it was created with forever. Comparing against it instead
      // of the merged/effective mode meant that once a comment auto-
      // collapsed for the first time, the very next zoom crossing back the
      // other way would compute targetMode === that unchanged raw mode,
      // wrongly conclude "already correct", and skip pushing the
      // corrective update - leaving the comment stuck collapsed no matter
      // how far back in you zoomed afterward.
      const feature = state.getMergedFeature(id);
      if (!feature || !isComment(feature)) return;
      const comment = feature as Comment;

      // Get threshold - uses explicit value if set, otherwise computes from dimensions
      const threshold = this.getCommentZoomThreshold(comment);

      // Determine target mode based on zoom
      const targetMode =
        zoom < threshold ? COMMENT_MODE_COLLAPSED : COMMENT_MODE_EXPANDED;

      // Only update if mode needs to change
      if (comment.properties.mode === targetMode) return;
      updates[id] = {
        properties: {
          ...comment.properties,
          mode: targetMode
        }
      };
    });
    state.applyLiveUpdates(updates);
  }

  /**
   * Get the effective zoom threshold for a comment
   * Uses explicit threshold if set, otherwise calculates from dimensions
   * @param comment Comment to get threshold for
   * @returns Zoom threshold
   */
  private getCommentZoomThreshold(comment: Comment): number {
    const style = { ...comment.properties.style };
    if (style.collapseZoomThreshold !== undefined) {
      return style.collapseZoomThreshold;
    }
    // Calculate based on dimensions: collapse when screen-space width < 80px
    const minReadableWidth = 80;
    const threshold = minReadableWidth / comment.properties.width;
    // Clamp between reasonable bounds
    return Math.max(0.1, Math.min(1.0, threshold));
  }
}
