# Comment Annotation Redesign - Implementation Plan

## Overview

Transform the Comment annotation into a specialized type that:
- Always maintains a **fixed size** (screen-space dimensions)
- Always has an **arrow/pointer attached** to it
- Can be in **collapsed mode** (icon) or **expanded mode** (text box)
- Arrow can point to: coordinates, nodes, or other annotations

---

## Current State Analysis

### Current Comment Implementation
- **Type**: `Comment extends AnnotationFeature<Polygon, CommentProps>`
- **Geometry**: Uses Polygon (inherited from current implementation)
- **Properties**: `text`, `author`, `timestamp` (extends `BoxProperties`)
- **Sizing**: Variable size based on polygon geometry
- **Rendering**: Rendered as a box with text content
- **No arrow**: No built-in pointer mechanism

### Existing System Capabilities to Leverage
- **Arrow type**: Full-featured arrows with extremities, linking, and snapping
- **Links system**: Bidirectional attachment to nodes and annotations
- **Fixed-size rendering**: Text annotations support `fixedSize` property for screen-space sizing
- **Box properties**: Width/height management and positioning
- **Live updates**: Drag preview system for smooth interactions

---

## Design Proposal

### 1. Comment Structure Redesign

#### New Comment Properties
```typescript
export interface CommentProps extends Omit<BoxProperties, "type"> {
  type: "comment";

  // Content
  content: string;          // Text content (similar to text annotation)

  // Display mode
  mode: "collapsed" | "expanded";

  // Fixed dimensions (screen-space pixels)
  width: number;            // Width in expanded mode
  height: number;           // Auto-grows with content
  minHeight: number;        // Minimum height (default: 60px)
  iconSize: number;         // Size when collapsed (default: 32px)

  // Styling
  style?: CommentStyle;
}

// Note: Arrow linking is stored separately in Arrow features
// Arrows reference comments via their link.start or link.end properties
// Comments do NOT store arrow references - this maintains existing architecture

export interface CommentStyle extends TextStyle {
  // Icon styling (collapsed mode)
  iconColor?: string;       // Background color for collapsed icon
  iconSymbol?: string;      // Icon to display when collapsed (default: "💬")
  iconBorderColor?: string;
  iconBorderWidth?: number;

  // Editing UI
  showSendButton?: boolean; // Show "send" button in edit mode (default: true)
  autoGrow?: boolean;       // Auto-grow height with content (default: true)
}

export type Comment = AnnotationFeature<Point, CommentProps>;
```

**Key Changes:**
- **Geometry**: Switch from `Polygon` to `Point` (comment box center position)
- **Fixed size**: Always use `fixedSize` behavior (screen-aligned)
- **Arrow linking**: Arrows store references to comments (NOT vice versa) - maintains existing architecture
- **Mode toggle**: Collapsed (icon) vs expanded (text box)
- **Auto-growing**: Height increases as content is typed
- **Send button**: Optional "send" button for finalizing comments

---

### 2. Geometry and Positioning

#### Comment Position
- **Geometry type**: `Point` - stores the center position of the comment box/icon
- **Fixed size**: Always rendered in screen space (like fixed-size text)
- **Rotation**: Always screen-aligned (unaffected by viewport rotation)

#### Arrow-Comment Relationship

**IMPORTANT**: Comments do NOT store arrow references. Instead:
- **Arrows store comment references** in their `link` property (just like they do for text/box annotations)
- **Links system manages the bidirectional relationship**
- **A comment MUST have at least one arrow pointing TO it** (programmatic constraint)
- **Comments can have multiple arrows** pointing to them from different sources
- Arrows can point FROM comments TO other entities (nodes, annotations, coordinates)

This maintains the existing architecture where:
```typescript
// Arrow feature (existing structure)
{
  type: "arrow",
  properties: {
    link: {
      start: { id: "comment-123", type: "comment", magnet: {x: 0.5, y: 0} },
      end: { id: "node-456", type: "node", magnet: {x: 0, y: 0} }
    }
  },
  geometry: { type: "LineString", coordinates: [[x1, y1], [x2, y2]] }
}

// Comment feature (new structure - no arrow reference!)
{
  type: "comment",
  properties: {
    content: "This needs attention",
    mode: "expanded",
    width: 200,
    height: 120,
    // NO arrow property!
  },
  geometry: { type: "Point", coordinates: [x, y] }
}
```

#### Spatial Relationship
```
Target (Node/Annotation/Coordinate)
    ▲
    | <-- Arrow (separate feature, references comment in link.start)
    |
┌─────────────┐
│   Comment   │ <-- Comment box (always fixed size)
│   Content   │
│   [Send]    │ <-- Optional send button
└─────────────┘
```

#### Programmatic Constraints: Arrow-Comment Lifecycle

**1. Comments Must Have At Least One Arrow**
- **Creation**: When creating a comment, automatically create at least one arrow feature that links to it
- **Deletion**: When deleting a comment, automatically delete ALL its associated arrows
- **Validation**: Store method validates that every comment has at least one arrow pointing to it
- **Query helpers**: Provide `getCommentArrows(commentId)` to find all associated arrows

**2. Arrows Cannot Be Detached From Comments**
- **If arrow points TO a comment** (`link.end.type === "comment"`):
  - Arrow END point cannot be dragged to detach it
  - Arrow can only be deleted if comment has multiple arrows (not the last one)
  - Arrow START point can be freely moved/retargeted
- **If arrow points FROM a comment** (`link.start.type === "comment"`):
  - Arrow START point cannot be dragged to detach it
  - Arrow can be freely deleted (doesn't affect comment lifecycle)
  - Arrow END point can be freely moved/retargeted

**3. Multiple Arrows Support**
- Comments can have multiple arrows pointing TO them (multi-source)
- Each arrow can originate from different nodes, annotations, or coordinates
- All arrows move together when comment is dragged (handled by Links system)
- Useful for: "multiple issues point to same comment" or "comment references multiple sources"

---

### 3. Implementation Architecture

#### 3.1 Type Definition Changes

**File**: `packages/ogma-annotations/src/types/features/Comment.ts`

- Redefine `CommentProps` with new properties
- Change geometry from `Polygon` to `Point`
- Add `CommentStyle` interface
- Update `isComment()` type guard
- Add helper functions:
  ```typescript
  export function createComment(
    position: Point,
    content: string,
    options?: Partial<CommentProps>
  ): Comment;

  export function createCommentWithArrow(
    position: Point,
    content: string,
    target: CommentTarget,
    options?: {
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ): { comment: Comment; arrow: Arrow }; // Returns both features

  export function toggleCommentMode(comment: Comment): Comment;

  export function getCommentArrow(commentId: Id, store: AnnotationState): Arrow | null;

  export function getCommentArrowCoordinates(
    comment: Comment,
    arrow: Arrow,
    targetPosition: Point
  ): [Point, Point]; // [start, end]
  ```

#### 3.2 Rendering Changes

**File**: `packages/ogma-annotations/src/renderer/shapes/comment.ts` (new file)

Create dedicated comment renderer:

```typescript
export function renderComment(
  svg: SVGSVGElement,
  comment: Comment,
  state: RenderState,
  cache: Map<Id, SVGElement>
): SVGElement {
  // Get or create SVG group
  const group = getOrCreateGroup(cache, comment.id);

  // Calculate screen-aligned position
  const transform = getScreenAlignedTransform(comment, state.zoom, state.rotation);

  if (comment.properties.mode === "collapsed") {
    // Render as icon (small circle with emoji/symbol)
    renderCollapsedIcon(group, comment);
  } else {
    // Render as text box
    renderExpandedBox(group, comment);
  }

  // Note: Arrow is rendered separately by renderCommentArrow()

  return group;
}

function renderCollapsedIcon(group: SVGGElement, comment: Comment): void {
  // Create circle background
  // Add icon symbol (text or emoji)
  // Apply styling
}

function renderExpandedBox(group: SVGGElement, comment: Comment): void {
  // Create rounded rectangle
  // Add text content (using textbox library)
  // Add author/timestamp if present
  // Apply styling
}
```

**File**: `packages/ogma-annotations/src/renderer/shapes/commentArrow.ts` (new file)

Create dedicated comment arrow renderer:

```typescript
export function renderCommentArrow(
  svg: SVGSVGElement,
  comment: Comment,
  targetPosition: Point,
  state: RenderState,
  cache: Map<Id, SVGElement>
): SVGElement {
  // Calculate arrow start point (from comment box edge)
  const commentCenter = comment.geometry.coordinates;
  const arrowStart = calculateCommentAnchorPoint(comment, targetPosition);

  // Calculate arrow end point (at target)
  const arrowEnd = targetPosition;

  // Create arrow path
  const arrow = createArrowPath(arrowStart, arrowEnd, comment.properties.arrow.style);

  return arrow;
}

function calculateCommentAnchorPoint(
  comment: Comment,
  targetPosition: Point
): Point {
  // Determine which edge of the comment box to attach arrow
  // Based on direction to target
  // Return point on box perimeter
}
```

**File**: `packages/ogma-annotations/src/renderer/shapes/index.ts`

Update main renderer:
- Add comment rendering to render loop
- Render comment arrows in arrow layer (before annotations)
- Handle collapsed vs expanded states
- Apply hover/selection states

#### 3.3 Interaction and Editing

**File**: `packages/ogma-annotations/src/handlers/CommentHandler.ts` (new file)

Create dedicated comment handler:

```typescript
export class CommentHandler extends Handler<Comment, CommentHandle> {
  // Handle types:
  // - "body": drag entire comment
  // - "toggle": click to collapse/expand
  // - "arrow": drag arrow endpoint (retarget)

  protected detectHandle(evt: ClientMouseEvent, zoom: number): CommentHandle | null {
    const point = evt.graph;

    // Check if clicking toggle icon (top-right corner)
    if (this.isOverToggleButton(point)) {
      return { type: "toggle" };
    }

    // Check if clicking arrow endpoint (for retargeting)
    if (this.isOverArrowEndpoint(point)) {
      return { type: "arrow" };
    }

    // Otherwise, body drag
    return { type: "body" };
  }

  protected onDrag(evt: ClientMouseEvent): void {
    const handle = this.currentHandle;

    if (handle.type === "body") {
      // Move entire comment
      this.moveComment(evt.graph);
    } else if (handle.type === "arrow") {
      // Retarget arrow (with snapping)
      this.retargetArrow(evt.graph);
    }
  }

  handleClick(evt: MouseEvent): void {
    if (this.currentHandle?.type === "toggle") {
      // Toggle collapsed/expanded mode
      this.toggleMode();
    }
  }

  private toggleMode(): void {
    const newMode = this.annotation.properties.mode === "collapsed"
      ? "expanded"
      : "collapsed";

    store.updateFeature(this.annotation.id, {
      properties: {
        ...this.annotation.properties,
        mode: newMode
      }
    });
  }
}
```

**File**: `packages/ogma-annotations/src/handlers/index.ts`

Update `AnnotationEditor`:
- Register `CommentHandler` for comment annotations
- Route comment interactions to CommentHandler

#### 3.4 Detection and Collision

**File**: `packages/ogma-annotations/src/interaction/detection.ts`

Add comment detection:

```typescript
export function detectComment(
  comment: Comment,
  point: Point,
  threshold: number,
  zoom: number
): boolean {
  const center = comment.geometry.coordinates;
  const props = comment.properties;

  // Get screen-space dimensions
  const size = props.mode === "collapsed"
    ? props.iconSize
    : { width: props.width, height: props.height };

  // AABB collision in screen space
  const halfWidth = size.width / 2 / zoom;
  const halfHeight = size.height / 2 / zoom;

  return (
    point.x >= center.x - halfWidth - threshold &&
    point.x <= center.x + halfWidth + threshold &&
    point.y >= center.y - halfHeight - threshold &&
    point.y <= center.y + halfHeight + threshold
  );
}

export function detectCommentArrow(
  comment: Comment,
  targetPosition: Point,
  point: Point,
  threshold: number
): boolean {
  // Calculate arrow line coordinates
  const [start, end] = getCommentArrowCoordinates(comment, targetPosition);

  // Use existing arrow detection logic
  return detectLineSegment(start, end, point, threshold);
}
```

Update `InteractionController`:
- Add comment detection to `detect()` method
- Include comment arrow in detection (treat as part of comment)

#### 3.5 Comment Lifecycle and Arrow Management

**File**: `packages/ogma-annotations/src/commentHelpers.ts` (new file)

Handle comment-arrow lifecycle and queries:

```typescript
export type CommentTarget =
  | { type: "coordinate"; coordinate: Point }
  | { type: "node"; nodeId: Id; magnet?: Point }
  | { type: "annotation"; annotationId: Id; magnet?: Point };

export class CommentHelpers {
  constructor(
    private store: AnnotationStore,
    private links: Links
  ) {}

  /**
   * Find all arrows that point TO a comment
   * Searches for arrows where link.end.id === commentId
   */
  getCommentArrows(commentId: Id): Arrow[] {
    const arrows = Object.values(this.store.features).filter(isArrow);
    return arrows.filter(arrow =>
      arrow.properties.link?.end?.id === commentId
    );
  }

  /**
   * Find the primary arrow (first one created, or use as default)
   */
  getPrimaryCommentArrow(commentId: Id): Arrow | null {
    const arrows = this.getCommentArrows(commentId);
    return arrows[0] || null;
  }

  /**
   * Create comment + arrow atomically
   * Ensures arrow always points TO the comment
   */
  createCommentWithArrow(
    commentPosition: Point,
    content: string,
    target: CommentTarget,
    options?: {
      commentStyle?: Partial<CommentProps>;
      arrowStyle?: Partial<ArrowProperties>;
    }
  ): { comment: Comment; arrow: Arrow } {
    // Create comment
    const comment = createComment(commentPosition, content, options?.commentStyle);

    // Create arrow pointing TO comment
    const arrow = createArrow(
      [target coordinate/position],
      [commentPosition with magnet offset],
      {
        ...options?.arrowStyle,
        link: {
          start: this.createTargetLink(target),
          end: {
            id: comment.id,
            side: "end",
            type: "comment",
            magnet: { x: 0, y: -0.5 } // Top center of comment box
          }
        }
      }
    );

    return { comment, arrow };
  }

  /**
   * Add an additional arrow to an existing comment
   */
  addArrowToComment(
    commentId: Id,
    target: CommentTarget,
    arrowStyle?: Partial<ArrowProperties>
  ): Arrow {
    const comment = this.store.features[commentId];
    if (!isComment(comment)) {
      throw new Error(`Feature ${commentId} is not a comment`);
    }

    // Create arrow pointing TO comment
    const arrow = createArrow(
      [target coordinate/position],
      [comment position with magnet offset],
      {
        ...arrowStyle,
        link: {
          start: this.createTargetLink(target),
          end: {
            id: commentId,
            side: "end",
            type: "comment",
            magnet: { x: 0, y: -0.5 }
          }
        }
      }
    );

    return arrow;
  }

  /**
   * Delete a single arrow from a comment
   * Prevents deletion if it's the last arrow
   */
  deleteArrowFromComment(arrowId: Id): boolean {
    const arrow = this.store.features[arrowId];
    if (!isArrow(arrow)) return false;

    const commentId = arrow.properties.link?.end?.id;
    if (!commentId || arrow.properties.link?.end?.type !== "comment") {
      // Not a comment arrow, allow deletion
      return true;
    }

    // Check if this is the last arrow
    const arrows = this.getCommentArrows(commentId);
    if (arrows.length <= 1) {
      console.warn("Cannot delete last arrow attached to comment");
      return false;
    }

    // Safe to delete
    this.store.deleteFeature(arrowId);
    return true;
  }

  /**
   * Delete comment and ALL its arrows together
   */
  deleteCommentWithArrows(commentId: Id): void {
    const arrows = this.getCommentArrows(commentId);

    // Delete all arrows first
    arrows.forEach(arrow => {
      this.store.deleteFeature(arrow.id);
    });

    // Then delete comment
    this.store.deleteFeature(commentId);
  }

  /**
   * Validate that comment has at least one arrow pointing to it
   */
  validateComment(commentId: Id): boolean {
    const arrows = this.getCommentArrows(commentId);
    return arrows.length > 0;
  }

  /**
   * Check if an arrow can be safely deleted
   * Returns false if it's the last arrow on a comment
   */
  canDeleteArrow(arrowId: Id): boolean {
    const arrow = this.store.features[arrowId];
    if (!isArrow(arrow)) return false;

    const commentId = arrow.properties.link?.end?.id;
    if (!commentId || arrow.properties.link?.end?.type !== "comment") {
      return true; // Not attached to comment, can delete
    }

    const arrows = this.getCommentArrows(commentId);
    return arrows.length > 1; // Can delete if not the last one
  }

  /**
   * Get all comments (useful for validation)
   */
  getAllComments(): Comment[] {
    return Object.values(this.store.features).filter(isComment);
  }

  /**
   * Check for orphaned comments (without any arrows)
   */
  findOrphanedComments(): Comment[] {
    return this.getAllComments().filter(comment =>
      this.getCommentArrows(comment.id).length === 0
    );
  }

  /**
   * Check if arrow endpoint can be detached from target
   * Returns false for arrows attached to comments
   */
  canDetachArrowEnd(arrowId: Id): boolean {
    const arrow = this.store.features[arrowId];
    if (!isArrow(arrow)) return true;

    // Cannot detach if END points to a comment
    return arrow.properties.link?.end?.type !== "comment";
  }

  /**
   * Check if arrow start point can be detached from source
   * Returns false for arrows originating from comments
   */
  canDetachArrowStart(arrowId: Id): boolean {
    const arrow = this.store.features[arrowId];
    if (!isArrow(arrow)) return true;

    // Cannot detach if START points from a comment
    return arrow.properties.link?.start?.type !== "comment";
  }

  private createTargetLink(target: CommentTarget): ExportedLink {
    switch (target.type) {
      case "coordinate":
        return {
          id: "coordinate", // Special case: no ID for coordinates
          side: "start",
          type: "coordinate" as any,
          magnet: target.coordinate
        };
      case "node":
        return {
          id: target.nodeId,
          side: "start",
          type: "node",
          magnet: target.magnet
        };
      case "annotation":
        return {
          id: target.annotationId,
          side: "start",
          type: getAnnotationType(target.annotationId),
          magnet: target.magnet
        };
    }
  }
}
```

**File**: `packages/ogma-annotations/src/links.ts`

Extend links system for comments:
- Add `"comment"` to `TargetType` enum
- Comments can be link targets (arrows point TO them)
- No changes needed for link storage - existing structure works!

**File**: `packages/ogma-annotations/src/store/index.ts`

Add validation and lifecycle hooks:

```typescript
// In store actions:
addFeature(feature: Annotation): void {
  // If adding a comment, validate it will have/has an arrow
  if (isComment(feature)) {
    // Optionally warn or throw if no arrow exists yet
    // (may need to defer validation until both features are added)
  }
  // ... existing logic
}

deleteFeature(id: Id): void {
  const feature = this.features[id];

  // If deleting a comment, also delete ALL its arrows
  if (isComment(feature)) {
    const arrows = commentHelpers.getCommentArrows(id);
    arrows.forEach(arrow => {
      delete this.features[arrow.id];
    });
  }

  // If deleting an arrow that points to a comment, check if allowed
  if (isArrow(feature) && feature.properties.link?.end?.type === "comment") {
    const commentId = feature.properties.link.end.id;
    const arrows = commentHelpers.getCommentArrows(commentId);

    if (arrows.length <= 1) {
      // This is the last arrow - prevent deletion
      console.error("Cannot delete last arrow attached to comment");
      throw new Error("Cannot delete last arrow attached to comment. Delete the comment instead.");
      return;
    }
    // Otherwise, safe to delete (not the last arrow)
  }

  delete this.features[id];
  // ... existing logic
}
```

---

### 4. User Interactions

#### Creating a Comment
1. User activates "Add Comment" tool
2. User clicks on target (node, annotation, or coordinate)
3. System creates TWO features atomically:
   - Comment box at default offset from target
   - Arrow pointing FROM target TO comment
4. Comment opens in expanded mode with text input focus
5. User types comment content (box auto-grows in height)
6. User clicks "Send" button or presses Cmd+Enter to finalize
7. Comment becomes non-editable (until clicked again)

#### Editing a Comment
1. User selects comment (click)
2. Comment shows selection state (highlight)
3. All arrows connected to comment are highlighted
4. User can:
   - **Drag body**: Move entire comment (all arrows stay connected via links system)
   - **Click toggle button**: Collapse/expand mode
   - **Click text area** (expanded mode): Enter edit mode
     - Text becomes editable
     - "Send" button appears
     - Height auto-grows as content is typed
     - Press Cmd+Enter or click "Send" to finish editing
   - **Drag arrow start points**: Retarget where arrows come FROM
   - **Delete arrow**: Click delete on arrow (only if comment has multiple arrows)
   - **Add arrow**: Right-click comment → "Add arrow" → click target
   - **Note**: Arrow END points (pointing to comment) cannot be detached or moved

#### Collapsing/Expanding
1. User clicks toggle button (top-right corner icon)
2. Comment smoothly transitions between modes:
   - **Collapsed**: Small icon (e.g., 💬) with colored background
   - **Expanded**: Full text box with content visible
3. Arrow remains connected in both modes

#### Managing Multiple Arrows
1. **Adding an arrow to a comment**:
   - Right-click comment → "Add arrow"
   - Click on target (node, annotation, or coordinate)
   - New arrow appears connecting target to comment

2. **Retargeting an arrow**:
   - Drag arrow START point (when comment is selected)
   - Arrow visually follows cursor
   - Snapping highlights when over valid targets
   - Release to attach to new target
   - Arrow feature updates its link.start property

3. **Deleting an arrow from a comment**:
   - Select arrow (click on it)
   - Press Delete key or click delete button
   - If it's the last arrow: Shows error "Cannot delete last arrow. Delete comment instead."
   - If multiple arrows exist: Arrow is deleted successfully

4. **Constraints**:
   - Arrow END points (pointing TO comment) cannot be moved or detached
   - Arrow START points can be freely moved to retarget
   - Comment must always have at least one arrow

---

### 5. Default Styling

```typescript
export const defaultCommentStyle: CommentStyle = {
  // Box styling
  background: "#FFFACD",        // Light yellow (sticky note color)
  padding: 8,
  borderRadius: 4,
  strokeColor: "#DDD",
  strokeWidth: 1,
  strokeType: "plain",

  // Icon styling (collapsed mode)
  iconColor: "#FFD700",         // Gold
  iconSymbol: "💬",
  iconBorderColor: "#CCC",
  iconBorderWidth: 2,

  // Text styling
  textColor: "#333",
  textFont: "Arial, sans-serif",
  textFontSize: 12,
};

export const defaultCommentOptions: Partial<CommentProps> = {
  mode: "expanded",
  width: 200,
  minHeight: 60,
  height: 60, // Initial height, will auto-grow
  iconSize: 32,
  style: defaultCommentStyle,
};

// Default arrow style for comment arrows
export const defaultCommentArrowStyle: Partial<ArrowProperties> = {
  style: {
    strokeColor: "#666",
    strokeWidth: 2,
    strokeType: "plain",
    head: "arrow",    // Arrow points TO the comment
    tail: "none",
  }
};
```

---

### 6. Migration Strategy

Since this is a breaking change to the Comment type:

#### Option A: Version Migration
1. Detect old Comment format (Polygon geometry)
2. Convert to new format:
   - Calculate center point from polygon
   - Set default arrow pointing to polygon centroid
   - Set expanded mode
   - Set default fixed size
3. Store version number in annotation metadata

#### Option B: Create New Type
1. Introduce new type: `"comment-v2"` or `"note"`
2. Keep old `"comment"` type for backward compatibility
3. Add deprecation warning for old type
4. Provide conversion utility

**Recommendation**: Option A with automated migration on load

---

### 7. Implementation Phases

#### Phase 1: Core Type and Data Model (2-3 days)
- [ ] Update `CommentProps` interface
- [ ] Change geometry from Polygon to Point
- [ ] Add mode, arrow, and styling properties
- [ ] Update type guards and helpers
- [ ] Add migration logic for old comments

#### Phase 2: Rendering (3-4 days)
- [ ] Create `renderComment()` for box/icon rendering
- [ ] Create `renderCommentArrow()` for arrow rendering
- [ ] Integrate into main renderer
- [ ] Implement collapsed vs expanded visual states
- [ ] Apply screen-aligned transform (fixed size)
- [ ] Handle hover and selection states

#### Phase 3: Comment-Arrow Lifecycle (2-3 days)
- [ ] Implement `CommentHelpers` class
- [ ] Add `createCommentWithArrow()` method (atomic creation)
- [ ] Add `getCommentArrows()` query method (returns array)
- [ ] Add `addArrowToComment()` method (add additional arrows)
- [ ] Add `deleteArrowFromComment()` method (with last-arrow protection)
- [ ] Add `deleteCommentWithArrows()` method (atomic deletion of comment + all arrows)
- [ ] Add `canDeleteArrow()`, `canDetachArrowEnd()`, `canDetachArrowStart()` validation methods
- [ ] Add validation methods (orphan detection)
- [ ] Update store lifecycle hooks (addFeature, deleteFeature) with multi-arrow support
- [ ] Update Links system to support "comment" target type
- [ ] Handle arrow updates when comment moves (existing Links system)

#### Phase 4: Interaction and Editing (4-5 days)
- [ ] Create `CommentHandler`
- [ ] Implement body drag (move comment, arrow follows via Links)
- [ ] Implement toggle mode interaction
- [ ] Implement text editing mode with "Send" button
- [ ] Implement auto-growing height as content is typed
- [ ] Add keyboard shortcuts (Cmd+Enter to send)
- [ ] Prevent arrow END point from being detached (if points to comment)
- [ ] Prevent arrow START point from being detached (if points from comment)
- [ ] Allow arrow START point retargeting for arrows pointing TO comments
- [ ] Implement "Add arrow" context menu action
- [ ] Prevent arrow deletion if it's the last arrow on a comment
- [ ] Update spatial index for detection
- [ ] Add `detectComment()` function
- [ ] Highlight all arrows when comment is selected

#### Phase 5: Creation Flow (2-3 days)
- [ ] Add "Add Comment" tool to toolbar
- [ ] Implement click-to-place creation (creates comment + arrow atomically)
- [ ] Implement target selection during creation
- [ ] Auto-position comment relative to target
- [ ] Set initial text input focus with "Send" button visible
- [ ] Handle creation cancellation (deletes both comment and arrow)
- [ ] Validate comments always have arrows on load/import

#### Phase 6: Polish and Testing (2-3 days)
- [ ] Visual refinement (animations, transitions)
- [ ] Accessibility (keyboard navigation)
- [ ] Performance optimization (culling, caching)
- [ ] Unit tests for target resolution
- [ ] Integration tests for interactions
- [ ] Documentation and examples

**Total Estimated Time**: 15-21 days

---

### 8. Open Questions and Decisions Needed

1. **Arrow anchor point**: Should arrow always point to bottom/top of comment, or auto-determine based on target direction?
   - **Proposal**: Auto-determine for better visual layout

2. **Arrow direction**: Should arrow point FROM target TO comment, or FROM comment TO target?
   - **Decision**: Arrow points FROM target TO comment (comment is link.end)
   - This makes semantic sense: "target has a comment"

3. **Collapsed icon customization**: Should users be able to choose different icons/colors?
   - **Proposal**: Yes, include in style properties

4. **Arrow style**: Should comment arrows have default style different from regular arrows?
   - **Proposal**: Yes, use subtle defaults (gray, medium weight)

5. **Minimum/maximum comment size**:
   - **Proposal**:
     - Min width: 150px, min height: 60px
     - Max width: 400px (fixed)
     - Max height: unbounded (auto-grows with content)

6. **Auto-grow behavior**: Should height auto-grow as user types?
   - **Decision**: YES - height auto-grows, no scrolling

7. **Send button**: Always visible or only in edit mode?
   - **Proposal**: Only visible in edit mode

8. **Orphaned comments**: What if user tries to delete the last arrow?
   - **Decision**: Store prevents deletion with error message
   - User must delete comment itself (which deletes all arrows)

9. **Multiple arrows per comment**: Should comments support multiple arrows?
   - **Decision**: YES - comments can have multiple arrows pointing TO them
   - Use cases: Multiple sources referencing same comment, multi-issue tracking
   - First arrow is considered "primary" for default behaviors

10. **Arrow deletion UI**: How to communicate "cannot delete last arrow"?
   - **Proposal**: Show toast/notification with helpful message
   - Message: "Cannot delete last arrow. Delete the comment instead."

11. **Visual distinction**: Should multiple arrows have visual priority?
   - **Proposal**: All arrows render equally, no priority styling
   - When comment is selected, all its arrows are highlighted

---

### 9. API Examples

#### Creating a Comment
```typescript
import { CommentHelpers } from "./commentHelpers";

const commentHelpers = new CommentHelpers(store, links);

// Create comment pointing FROM a coordinate
const { comment: comment1, arrow: arrow1 } = commentHelpers.createCommentWithArrow(
  { x: 100, y: 100 },           // Comment position
  "This needs attention",        // Content
  {
    type: "coordinate",
    coordinate: { x: 50, y: 50 } // Target coordinate
  }
);

// Create comment pointing FROM a node
const { comment: comment2, arrow: arrow2 } = commentHelpers.createCommentWithArrow(
  { x: 200, y: 200 },
  "Critical node",
  {
    type: "node",
    nodeId: "node-123"
  }
);

// Create comment pointing FROM an annotation
const { comment: comment3, arrow: arrow3 } = commentHelpers.createCommentWithArrow(
  { x: 300, y: 300 },
  "See this box",
  {
    type: "annotation",
    annotationId: "box-456"
  }
);

// Add BOTH features to store (order matters: arrow first for link validation)
store.addFeature(arrow1);
store.addFeature(comment1);
```

#### Toggling Mode
```typescript
const updatedComment = toggleCommentMode(comment);
store.updateFeature(comment.id, updatedComment);
```

#### Finding Comment's Arrows
```typescript
const commentHelpers = new CommentHelpers(store, links);

// Get all arrows that point to this comment
const arrows = commentHelpers.getCommentArrows(comment.id);

console.log(`Comment has ${arrows.length} arrow(s)`);
arrows.forEach(arrow => {
  console.log("Arrow links:", arrow.properties.link);
  // link.end will be the comment
  // link.start will be the target
});

// Get primary (first) arrow
const primaryArrow = commentHelpers.getPrimaryCommentArrow(comment.id);
```

#### Adding Multiple Arrows
```typescript
// Create comment with initial arrow
const { comment, arrow } = commentHelpers.createCommentWithArrow(
  { x: 100, y: 100 },
  "Multi-source issue",
  { type: "node", nodeId: "node-1" }
);

store.addFeature(arrow);
store.addFeature(comment);

// Add second arrow from different source
const arrow2 = commentHelpers.addArrowToComment(
  comment.id,
  { type: "node", nodeId: "node-2" },
  { style: { strokeColor: "#FF0000" } } // Custom style
);

store.addFeature(arrow2);

// Add third arrow from coordinate
const arrow3 = commentHelpers.addArrowToComment(
  comment.id,
  { type: "coordinate", coordinate: { x: 200, y: 200 } }
);

store.addFeature(arrow3);
```

#### Deleting Arrows and Comments
```typescript
// Try to delete a single arrow
const success = commentHelpers.deleteArrowFromComment(arrow.id);
if (!success) {
  console.log("Cannot delete - this is the last arrow on the comment");
}

// Check if arrow can be deleted before attempting
if (commentHelpers.canDeleteArrow(arrow.id)) {
  commentHelpers.deleteArrowFromComment(arrow.id);
}

// Delete comment AND ALL its arrows atomically
commentHelpers.deleteCommentWithArrows(comment.id);

// This automatically:
// 1. Finds all arrows pointing to the comment
// 2. Deletes all arrows
// 3. Deletes the comment
```

#### Validating Comments and Arrows
```typescript
// Check if a comment has at least one arrow
const isValid = commentHelpers.validateComment(comment.id);

// Find orphaned comments (missing arrows)
const orphans = commentHelpers.findOrphanedComments();
if (orphans.length > 0) {
  console.warn("Found orphaned comments:", orphans);
}

// Check arrow detachment permissions
const canDetachEnd = commentHelpers.canDetachArrowEnd(arrow.id);
// Returns false if arrow points TO a comment

const canDetachStart = commentHelpers.canDetachArrowStart(arrow.id);
// Returns false if arrow points FROM a comment

// Check if arrow can be deleted
if (commentHelpers.canDeleteArrow(arrow.id)) {
  store.deleteFeature(arrow.id);
} else {
  console.log("Cannot delete - last arrow on comment");
}
```

#### Custom Styling
```typescript
const { comment, arrow } = commentHelpers.createCommentWithArrow(
  position,
  content,
  target,
  {
    commentStyle: {
      width: 250,
      minHeight: 80,
      style: {
        background: "#FFE6E6",      // Light pink
        iconColor: "#FF69B4",       // Hot pink
        iconSymbol: "⚠️",
        color: "#CC0000",           // Text color
        showSendButton: true,
        autoGrow: true,
      }
    },
    arrowStyle: {
      style: {
        strokeColor: "#FF69B4",    // Match icon color
        strokeWidth: 3,
        head: "arrow",
      }
    }
  }
);
```

---

## Summary

This design transforms Comments into a specialized, purpose-built annotation type that:
- ✅ Always maintains fixed screen-space size
- ✅ Always has at least one arrow pointing TO it (enforced programmatically)
- ✅ Supports multiple arrows per comment (multi-source references)
- ✅ Arrows stored separately (maintains existing architecture)
- ✅ Arrows cannot be detached from comments (can only retarget or delete with validation)
- ✅ Supports collapsed (icon) and expanded (text) modes
- ✅ Auto-grows height as content is typed
- ✅ Can be pointed to FROM coordinates, nodes, or other annotations
- ✅ Leverages existing architecture (Links, Handlers, Rendering)
- ✅ Provides smooth interactions with "Send" button UX
- ✅ Maintains data integrity through atomic operations and validation
- ✅ No metadata overhead (just content + styling)

The implementation builds on the existing annotation system's strengths while introducing new specialized behavior for the comment use case.
