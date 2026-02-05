// store/AnnotationStore.ts
import { Position } from "geojson";
import { temporal } from "zundo";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore as createVanillaStore } from "zustand/vanilla";
import { DEFAULT_SEND_ICON } from "../constants";
import {
  Annotation,
  Bounds,
  ControllerOptions,
  Id,
  isComment,
  isArrow,
  Point,
  DeepPartial,
  isText
} from "../types";
import { getAABB } from "../utils/geom";

const rotatedRect: Bounds = [0, 0, 0, 0];

/**
 * Equality function for temporal (undo/redo) middleware
 * Performs efficient shallow equality checks on features and state
 * This is critical for performance - avoids expensive JSON.stringify
 */
export function temporalEquality(
  a: {
    features: Record<Id, Annotation>;
    drawingFeature: Id | null;
    isDragging?: boolean;
    lastChangedFeatures?: Id[];
  },
  b: {
    features: Record<Id, Annotation>;
    drawingFeature: Id | null;
    isDragging?: boolean;
    lastChangedFeatures?: Id[];
  }
): boolean {
  // Check if number of features changed
  const aKeys = Object.keys(a.features);
  const bKeys = Object.keys(b.features);
  if (aKeys.length !== bKeys.length) return false;

  // Check if feature IDs are the same
  for (const key of aKeys) {
    if (!(key in b.features)) return false;
  }

  // Check if feature references are the same (shallow equality)
  // This works because features are immutable - any change creates new object
  for (const key of aKeys) {
    const aFeature = a.features[key];
    const bFeature = b.features[key];

    const aGeometry = aFeature.geometry;
    const bGeometry = bFeature.geometry;

    if (aGeometry.coordinates !== bGeometry.coordinates) return false;

    // If references are identical, skip detailed checks (optimization)
    //if (aFeature === bFeature) continue;

    // References differ - check if actual content differs
    // properties and style shallow comparison
    if (aFeature.properties !== bFeature.properties) return false;
    if (aFeature.properties.style !== bFeature.properties.style) return false;

    // geometry shallow comparison
    if (aGeometry !== bGeometry) return false;
  }

  // Check other partialized state
  return a.drawingFeature === b.drawingFeature;
}

export interface AnnotationState {
  // Persistent state (with history)
  features: Record<Id, Annotation>;

  // Temporary state (no history)
  liveUpdates: Record<Id, Partial<Annotation>>;
  isDragging: boolean;
  hoveredFeature: Id | null;
  hoveringHandle: boolean;
  hoveredHandle: -1 | number;
  selectedFeatures: Set<Id>;
  lastChangedFeatures: Id[];
  drawingFeature: Id | null;
  drawingPoints: Position[] | null;

  // Mouse press state for drag detection
  mousePressed: boolean;
  mousePressPoint: Point | null;

  rotation: number;
  sin: number;
  cos: number;
  revRotation: number;
  revSin: number;
  revCos: number;
  zoom: number;
  invZoom: number;

  // Controller options (for accessing in handlers)
  options: {
    showSendButton: boolean;
    sendButtonIcon: string;
    minArrowHeight: number;
    maxArrowHeight: number;
    detectMargin: number;
    magnetRadius: number;
    magnetHandleRadius: number;
    textPlaceholder: string;
  };

  setOptions: (options: Partial<AnnotationState["options"]>) => void;

  // Live update actions (for dragging/resizing)
  startLiveUpdate: (ids: Id[]) => void;
  applyLiveUpdate: (id: Id, updates: Partial<Annotation>) => void;
  applyLiveUpdates: (updates: Record<Id, DeepPartial<Annotation>>) => void;
  commitLiveUpdates: (ids?: Set<Id>) => void;
  cancelLiveUpdates: () => void;

  addFeature: (feature: Annotation) => void;
  removeFeature: (id: Id) => void;

  // Immediate actions (for style/property changes)
  updateFeature: (id: Id, updates: Partial<Annotation>) => void;
  updateFeatures: (updates: Record<Id, Partial<Annotation>>) => void;
  // Batch operations
  batchUpdate: (fn: () => void) => void;

  // State management actions
  setHoveredFeature: (id: Id | null) => void;
  setSelectedFeatures: (ids: Id[]) => void;
  addToSelection: (id: Id) => void;
  removeFromSelection: (id: Id) => void;
  toggleSelection: (id: Id) => void;
  clearSelection: () => void;

  // Getters
  getFeature: (id: Id) => Annotation | undefined;
  getAllFeatures: () => Annotation[];
  getMergedFeature: (id: Id) => Annotation | undefined;
  isHovered: (id: Id) => boolean;
  isSelected: (id: Id) => boolean;
  setRotation: (rotation: number) => void;
  setZoom: (zoom: number) => void;
  getScreenAlignedTransform: (
    ox: number,
    oy: number,
    scaled: boolean
  ) => string;
  getRotationTransform: (ox: number, oy: number) => string;

  getRotatedBBox: (x0: number, y0: number, x1: number, y1: number) => Bounds;
  setDrawingPoints: (points: Position[] | null) => void;
}

export const createStore = (initialOptions?: Partial<ControllerOptions>) => {
  const store = createVanillaStore<AnnotationState>()(
    subscribeWithSelector(
      temporal(
        (set, get) => ({
          features: {},
          liveUpdates: {},
          isDragging: false,
          hoveringHandle: false,
          hoveredHandle: -1,
          hoveredFeature: null,
          selectedFeatures: new Set(),
          lastChangedFeatures: [],
          drawingFeature: null,
          drawingPoints: null,
          mousePressed: false,
          mousePressPoint: null,
          rotation: 0,
          sin: 0,
          cos: 1,
          revRotation: 0,
          revSin: 0,
          revCos: 1,
          zoom: 1,
          invZoom: 1,

          options: {
            showSendButton: initialOptions?.showSendButton ?? true,
            sendButtonIcon: initialOptions?.sendButtonIcon ?? DEFAULT_SEND_ICON,
            minArrowHeight: initialOptions?.minArrowHeight ?? 20,
            maxArrowHeight: initialOptions?.maxArrowHeight ?? 30,
            detectMargin: initialOptions?.detectMargin ?? 2,
            magnetRadius: initialOptions?.magnetRadius ?? 10,
            magnetHandleRadius: initialOptions?.magnetHandleRadius ?? 5,
            textPlaceholder: initialOptions?.textPlaceholder ?? "Type here"
          },

          setOptions: (newOptions) =>
            set((state) => ({
              options: { ...state.options, ...newOptions }
            })),

          removeFeature: (id) =>
            set((state) => {
              const feature = state.features[id];
              if (!feature) return state;

              const { features, liveUpdates } = state;
              const toDelete = new Set<Id>([id]);

              // If deleting a comment, also delete ALL its arrows
              if (isComment(feature) || isText(feature)) {
                // Find all arrows pointing to/from this comment
                Object.values(features).forEach((f) => {
                  if (isArrow(f)) {
                    if (
                      f.properties.link?.end?.id === id ||
                      f.properties.link?.start?.id === id
                    ) {
                      toDelete.add(f.id);
                    }
                  }
                });
              }

              // If deleting an arrow that points to a comment, check if it's the last arrow
              if (isArrow(feature)) {
                const commentId =
                  feature.properties.link?.end?.type === "comment"
                    ? feature.properties.link.end.id
                    : feature.properties.link?.start?.type === "comment"
                      ? feature.properties.link.start.id
                      : null;

                if (commentId) {
                  // Count arrows connected to this comment
                  let arrowCount = 0;
                  Object.values(state.features).forEach((f) => {
                    if (isArrow(f) && f.id !== id) {
                      if (
                        f.properties.link?.end?.id === commentId ||
                        f.properties.link?.start?.id === commentId
                      ) {
                        arrowCount++;
                      }
                    }
                  });

                  // If this is the last arrow, prevent deletion
                  if (arrowCount === 0) {
                    // eslint-disable-next-line no-console
                    console.error(
                      "Cannot delete last arrow attached to comment. Delete the comment instead."
                    );
                    // Return unchanged state to prevent deletion
                    return state;
                  }
                }
              }

              // Create copies BEFORE any deletions to preserve history correctly
              const newFeatures = { ...features };
              const newLiveUpdates = { ...liveUpdates };

              // Delete all marked features from the copies
              toDelete.forEach((deleteId) => {
                delete newFeatures[deleteId];
                delete newLiveUpdates[deleteId];
              });

              return { features: newFeatures, liveUpdates: newLiveUpdates };
            }),

          addFeature: (feature) =>
            set((state) => ({
              features: {
                ...state.features,
                [feature.id]: feature as Annotation
              }
            })),

          // Start live update - snapshot current state
          startLiveUpdate: (ids) => {
            set((state) => ({
              liveUpdates: ids.reduce(
                (acc, id) => ({
                  ...acc,
                  [id]: { ...state.features[id] }
                }),
                {}
              )
            }));
          },

          // Apply live updates - no history, super fast!
          applyLiveUpdate: (id, updates) => {
            set((state) => ({
              liveUpdates: {
                ...state.liveUpdates,
                [id]: {
                  ...state.liveUpdates[id],
                  ...updates
                } as Annotation
              }
            }));
          },

          applyLiveUpdates: (updates) => {
            set((state) => {
              const newLiveUpdates = { ...state.liveUpdates };
              for (const id in updates) {
                newLiveUpdates[id] = updates[id] as Annotation;
              }
              return { liveUpdates: newLiveUpdates };
            });
          },

          // Commit all live updates - single history entry!
          commitLiveUpdates: (ids?: Set<Id>) => {
            const { features, liveUpdates } = get();
            const updatedFeatures = { ...features };
            const changedFeatureIds: Id[] = [];

            const keys = Object.keys(liveUpdates);
            if (!ids) ids = new Set(keys);

            // Merge live updates into features and track changes
            keys.forEach((id) => {
              const updates = liveUpdates[id];
              if (updatedFeatures[id] && Object.keys(updates).length > 0) {
                updatedFeatures[id] = {
                  ...updatedFeatures[id],
                  ...updates
                } as Annotation;
                changedFeatureIds.push(id);
              }
            });

            set({
              features: updatedFeatures,
              liveUpdates: {},
              isDragging: false,
              lastChangedFeatures: changedFeatureIds // Track which features changed
            });
          },

          cancelLiveUpdates: () =>
            set({
              liveUpdates: {},
              isDragging: false
            }),

          // Regular update - creates history entry
          updateFeature: (id, updates) =>
            set((state) => {
              const merged = {
                ...state.features[id],
                ...updates
              } as Annotation;

              // Clear any stale liveUpdates for this feature
              const newLiveUpdates = { ...state.liveUpdates };
              delete newLiveUpdates[id];

              return {
                features: {
                  ...state.features,
                  [id]: merged
                },
                liveUpdates: newLiveUpdates
              };
            }),

          // Batch update multiple features - single history entry
          updateFeatures: (updates) =>
            set((state) => {
              const newFeatures = { ...state.features };
              Object.entries(updates).forEach(([id, update]) => {
                if (newFeatures[id]) {
                  newFeatures[id] = {
                    ...newFeatures[id],
                    ...update
                  } as Annotation;
                }
              });
              return { features: newFeatures };
            }),

          // Batch wrapper - pauses history
          batchUpdate: (fn) => {
            const temporal = store.temporal.getState();
            temporal.pause();
            fn();
            temporal.resume();
          },

          // Getters
          getFeature: (id) => get().features[id],

          getMergedFeature: (id) => {
            const feature = get().features[id];
            const liveUpdate = get().liveUpdates[id];
            if (!feature) return undefined;
            return (
              liveUpdate ? { ...feature, ...liveUpdate } : feature
            ) as Annotation;
          },

          getAllFeatures: () => {
            const { features, liveUpdates } = get();
            return Object.entries(features).map(([id, feature]) => {
              const update = liveUpdates[id];
              return (
                update ? { ...feature, ...update } : feature
              ) as Annotation;
            });
          },

          // State management actions
          setHoveredFeature: (id) => set({ hoveredFeature: id }),

          setSelectedFeatures: (ids) => set({ selectedFeatures: new Set(ids) }),

          addToSelection: (id) => {
            const { selectedFeatures } = get();
            const newSelection = new Set(selectedFeatures);
            newSelection.add(id);
            set({ selectedFeatures: newSelection });
          },

          removeFromSelection: (id) => {
            const { selectedFeatures } = get();
            const newSelection = new Set(selectedFeatures);
            newSelection.delete(id);
            set({ selectedFeatures: newSelection });
          },

          toggleSelection: (id) => {
            const { selectedFeatures } = get();
            const newSelection = new Set(selectedFeatures);
            if (newSelection.has(id)) newSelection.delete(id);
            else newSelection.add(id);
            set({ selectedFeatures: newSelection });
          },

          clearSelection: () => set({ selectedFeatures: new Set() }),

          // State getters
          isHovered: (id) => get().hoveredFeature === id,

          isSelected: (id) => get().selectedFeatures.has(id),

          setRotation: (rotation: number) => {
            set({
              rotation,
              sin: Math.sin(rotation),
              cos: Math.cos(rotation),
              revRotation: -rotation,
              revSin: Math.sin(-rotation),
              revCos: Math.cos(-rotation)
            });
            // Don't trigger history for camera changes
          },

          setZoom: (zoom: number) => {
            set({
              zoom,
              invZoom: 1 / zoom
            });
          },

          getScreenAlignedTransform(ox, oy, scaled = true) {
            const sin = this.revSin;
            const cos = this.revCos;
            const x = ox * cos - oy * sin;
            const y = ox * sin + oy * cos;

            // scale it around its center
            const scale = scaled ? 1 : this.invZoom;

            return `matrix(${scale}, 0, 0, ${scale}, ${x}, ${y})`;
          },

          getRotationTransform(ox, oy) {
            const sin = this.revSin;
            const cos = this.revCos;
            const tx = ox * cos - oy * sin;
            const ty = ox * sin + oy * cos;
            return `matrix(${cos}, ${sin}, ${-sin}, ${cos}, ${-tx}, ${-ty})`;
          },

          getRotatedBBox(x0, y0, x1, y1) {
            const rabb = getAABB(
              x0,
              y0,
              x1 - x0,
              y1 - y0,
              this.sin,
              this.cos,
              x0 + (x1 - x0) / 2,
              y0 + (y1 - y0) / 2,
              rotatedRect
            );
            return rabb;
          },

          setDrawingPoints: (points: Position[] | null) =>
            set({ drawingPoints: points })
        }),
        {
          limit: 250,
          partialize: (state) => ({
            drawingFeature: state.drawingFeature,
            isDragging: state.isDragging,
            features: state.features, // Only track features, not liveUpdates!
            lastChangedFeatures: state.lastChangedFeatures
          }),
          equality: temporalEquality,

          handleSet: (handleSet) => (state) => {
            if ((state as AnnotationState).drawingFeature !== null) return;
            handleSet(state);
          }
        }
      )
    )
  );
  return store;
};

//export const { undo, redo, clear: clearHistory } = store.temporal.getState();

export type Store = ReturnType<typeof createStore>;
