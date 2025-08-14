// store/AnnotationStore.ts
import { temporal } from "zundo";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Annotation, Id } from "../types";

interface AnnotationState {
  // Persistent state (with history)
  features: Record<Id, Annotation>;

  // Temporary state (no history)
  liveUpdates: Record<Id, Partial<Annotation>>;
  isDragging: boolean;

  // Live update actions (for dragging/resizing)
  startLiveUpdate: (ids: Id[]) => void;
  applyLiveUpdate: (id: Id, updates: Partial<Annotation>) => void;
  commitLiveUpdates: () => void;
  cancelLiveUpdates: () => void;

  addFeature: (feature: Annotation) => void;
  removeFeature: (id: Id) => void;

  // Immediate actions (for style/property changes)
  updateFeature: (id: Id, updates: Partial<Annotation>) => void;
  updateFeatures: (updates: Record<Id, Partial<Annotation>>) => void;

  // Batch operations
  batchUpdate: (fn: () => void) => void;

  // Getters
  getFeature: (id: Id) => Annotation | undefined;
  getAllFeatures: () => Annotation[];
  getMergedFeature: (id: Id) => Annotation | undefined;
}

export const store = create<AnnotationState>()(
  subscribeWithSelector(
    temporal(
      (set, get) => ({
        features: {},
        liveUpdates: {},
        isDragging: false,

        removeFeature: (id) =>
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [id]: _, ...rest } = state.features;
            return { features: rest };
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
          set({
            liveUpdates: ids.reduce(
              (acc, id) => ({
                ...acc,
                [id]: {}
              }),
              {}
            ),
            isDragging: true
          });
        },

        // Apply live updates - no history, super fast!
        applyLiveUpdate: (id, updates) => {
          set((state) => ({
            liveUpdates: {
              ...state.liveUpdates,
              [id]: {
                ...state.liveUpdates[id],
                ...updates,
                // Deep merge for nested properties
                properties: updates.properties
                  ? {
                      ...state.liveUpdates[id]?.properties,
                      ...updates.properties
                    }
                  : state.liveUpdates[id]?.properties
              } as Annotation
            }
          }));
        },

        // Commit all live updates - single history entry!
        commitLiveUpdates: () => {
          const { features, liveUpdates } = get();
          const updatedFeatures = { ...features };

          // Merge live updates into features
          Object.entries(liveUpdates).forEach(([id, updates]) => {
            if (updatedFeatures[id] && Object.keys(updates).length > 0) {
              updatedFeatures[id] = {
                ...updatedFeatures[id],
                ...updates
              } as Annotation;
            }
          });

          set({
            features: updatedFeatures,
            liveUpdates: {},
            isDragging: false
          });
        },

        cancelLiveUpdates: () =>
          set({
            liveUpdates: {},
            isDragging: false
          }),

        // Regular update - creates history entry
        updateFeature: (id, updates) =>
          set((state) => ({
            features: {
              ...state.features,
              [id]: { ...state.features[id], ...updates } as Annotation
            }
          })),

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
            return (update ? { ...feature, ...update } : feature) as Annotation;
          });
        }
      }),
      {
        limit: 50,
        partialize: (state) => ({
          features: state.features // Only track features, not liveUpdates!
        }),
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
        handleSet: (handleSet) => (state) => {
          // Skip history during drag
          if ((state as AnnotationState).isDragging) return;
          handleSet(state);
        }
      }
    )
  )
);

export const { undo, redo, clear: clearHistory } = store.temporal.getState();

export type Store = typeof store;
