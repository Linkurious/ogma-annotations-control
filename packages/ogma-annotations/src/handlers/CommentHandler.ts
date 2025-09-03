import type { Point } from "@linkurious/ogma";
import {
  Handler,
  InteractionController,
  SpatialIndex,
  SnapEngine
} from "./Handler";
import { store } from "../store";

// TODO: Define Comment type when comment feature is implemented
type Comment = any;

export class CommentHandler extends Handler {
  private state: "idle" | "drawing" | "editing" = "idle";
  private editingFeature?: string;

  constructor(
    interaction: InteractionController,
    spatialIndex: SpatialIndex,
    snapEngine: SnapEngine,
    private ogma: any // TODO: Type this properly with Ogma
  ) {
    super(interaction, spatialIndex, snapEngine);
  }

  activate(mode: "draw" | "edit") {
    this.isActive = true;
    this.state = mode === "draw" ? "idle" : "editing";

    // Disable selection while this handler is active
    this.interaction.setMode(mode);
  }

  deactivate() {
    this.isActive = false;
    this.state = "idle";
    this.editingFeature = undefined;

    // Re-enable selection
    this.interaction.setMode("select");
  }

  handleMouseDown(e: MouseEvent) {
    if (!this.isActive) return;

    // TODO: Implement comment creation logic
    // Comments might be different from other annotations - they could be:
    // - Attached to specific nodes/edges
    // - Have threading/reply functionality
    // - Have different visual representation (speech bubbles, etc.)

    console.log("CommentHandler: Mouse down - not yet implemented");
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.isActive) return;

    // TODO: Implement comment preview/positioning logic
  }

  handleMouseUp(e: MouseEvent) {
    if (!this.isActive) return;

    // TODO: Implement comment finalization logic
  }

  startEdit(featureId: string, point: Point) {
    this.editingFeature = featureId;
    this.state = "editing";

    // TODO: Show comment editing UI
    // This might involve:
    // - Rich text editor
    // - Threading UI for replies
    // - User avatars/metadata
  }

  cancelEdit() {
    this.editingFeature = undefined;
    this.state = "idle";

    // TODO: Hide comment editing UI
  }

  protected clientToCanvas(e: MouseEvent): Point {
    if (!this.ogma) return { x: e.clientX, y: e.clientY };

    // TODO: Implement proper coordinate conversion when ogma instance is available
    return { x: e.clientX, y: e.clientY };
  }

  // Comment-specific methods
  public addReply(commentId: string, content: string) {
    // TODO: Implement reply functionality
    console.log(`Adding reply to comment ${commentId}:`, content);
  }

  public resolveComment(commentId: string) {
    // TODO: Implement comment resolution
    console.log(`Resolving comment ${commentId}`);
  }

  public deleteComment(commentId: string) {
    // TODO: Implement comment deletion
    store.getState().removeFeature(commentId);
  }
}
