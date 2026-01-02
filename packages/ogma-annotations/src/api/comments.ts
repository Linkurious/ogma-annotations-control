import { COMMENT_MODE_COLLAPSED, COMMENT_MODE_EXPANDED } from "../constants";
import { Store } from "../store";
import { Comment, Id, isComment } from "../types";

/**
 * Manages comment-specific functionality including zoom-based auto-collapse
 */
export class CommentManager {
  constructor(private store: Store) {}

  /**
   * Toggle a comment between collapsed and expanded mode
   * @param id The id of the comment to toggle
   */
  public toggleComment(id: Id): void {
    const feature = this.store.getState().getFeature(id);
    if (!feature || !isComment(feature)) return;

    const comment = feature as Comment;

    this.store.getState().applyLiveUpdate(id, {
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
    const state = this.store.getState();
    const features = state.features;

    Object.values(features).forEach((feature) => {
      if (isComment(feature)) {
        const comment = feature as Comment;

        // Get threshold - uses explicit value if set, otherwise computes from dimensions
        const threshold = this.getCommentZoomThreshold(comment);

        // Determine target mode based on zoom
        const targetMode =
          zoom < threshold ? COMMENT_MODE_COLLAPSED : COMMENT_MODE_EXPANDED;

        // Only update if mode needs to change
        if (comment.properties.mode !== targetMode) {
          //Use live updates to avoid history
          state.applyLiveUpdate(comment.id, {
            properties: {
              ...comment.properties,
              mode: targetMode
            }
          } as Partial<Comment>);
        }
      }
    });
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
