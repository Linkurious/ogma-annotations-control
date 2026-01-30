import { Links } from "../handlers/links";
import { Store } from "../store";

/**
 * Manages undo/redo history for annotations
 */
export class HistoryManager {
  constructor(
    private store: Store,
    private links: Links
  ) {}

  /**
   * Undo the last change
   * @returns true if undo was successful, false if no changes to undo
   */
  public undo(): boolean {
    if (!this.canUndo()) return false;
    this.store.temporal.getState().undo();
    this.links.refresh();
    return true;
  }

  /**
   * Redo the last undone change
   * @returns true if redo was successful, false if no changes to redo
   */
  public redo(): boolean {
    if (!this.canRedo()) return false;
    this.store.temporal.getState().redo();
    this.links.refresh();
    return true;
  }

  /**
   * Check if there are changes to undo
   * @returns true if undo is possible
   */
  public canUndo(): boolean {
    return this.store.temporal.getState().pastStates.length > 0;
  }

  /**
   * Check if there are changes to redo
   * @returns true if redo is possible
   */
  public canRedo(): boolean {
    return this.store.temporal.getState().futureStates.length > 0;
  }

  /**
   * Clear the undo/redo history
   */
  public clearHistory(): void {
    this.store.temporal.getState().clear();
  }
}
