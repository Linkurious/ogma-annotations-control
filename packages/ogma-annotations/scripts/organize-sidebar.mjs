#!/usr/bin/env node
/**
 * Post-processes typedoc-sidebar.json to create a human-friendly hierarchy:
 * 1. Control class (main entry point)
 * 2. Feature Types (Arrow, Text, Box, Polygon, Comment)
 * 3. Configuration & Options
 * 4. Events
 * 5. Utility Types
 * 6. Functions & Helpers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sidebarPath = path.resolve(__dirname, '../../../docs/api/typedoc-sidebar.json');

// Read the generated sidebar
const sidebar = JSON.parse(fs.readFileSync(sidebarPath, 'utf-8'));

// Extract all items into a flat map for easy lookup
const itemMap = new Map();

function extractItems(items, category) {
  items.forEach(item => {
    itemMap.set(item.text, { ...item, category });
  });
}

sidebar.forEach(section => {
  if (section.items) {
    extractItems(section.items, section.text);
  }
});

// Helper to get item or return null if not found
function getItem(name) {
  return itemMap.get(name) || null;
}

// Helper to get items matching a pattern
function getItems(names) {
  return names.map(name => getItem(name)).filter(Boolean);
}

// Build the new organized sidebar
const organizedSidebar = [
  {
    text: "Getting Started",
    collapsed: false,
    items: [
      getItem("Control"),
      {
        text: "Events",
        link: "/../../docs/api/type-aliases/FeatureEvents.md",
        collapsed: true,
        items: [
          {
            text: "select - fires when annotations are selected",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "unselect - fires when annotations are unselected",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "add - fires when annotation is added",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "remove - fires when annotation is removed",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "update - fires after any modification (drag, style, scale)",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "link - fires when arrow connects to node/annotation",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "cancelDrawing - fires when drawing is canceled",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "completeDrawing - fires when drawing completes",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          },
          {
            text: "history - fires when undo/redo state changes",
            link: "/../../docs/api/type-aliases/FeatureEvents.md"
          }
        ]
      }
    ].filter(Boolean)
  },
  {
    text: "Feature Types",
    collapsed: true,
    items: [
      {
        text: "Arrow",
        collapsed: true,
        items: getItems(["Arrow", "ArrowProperties", "ArrowStyles", "createArrow"])
      },
      {
        text: "Text",
        collapsed: true,
        items: getItems(["Text", "TextProperties", "TextStyle", "createText"])
      },
      {
        text: "Box",
        collapsed: true,
        items: getItems(["Box", "BoxProperties", "BoxStyle", "createBox"])
      },
      {
        text: "Polygon",
        collapsed: true,
        items: getItems(["Polygon", "PolygonProperties", "PolygonStyle", "createPolygon"])
      },
      {
        text: "Comment",
        collapsed: true,
        items: getItems([
          "Comment",
          "CommentProps",
          "CommentStyle",
          "createComment",
          "createCommentWithArrow",
          "CommentTarget",
          "COMMENT_MODE_COLLAPSED",
          "COMMENT_MODE_EXPANDED"
        ])
      }
    ]
  },
  {
    text: "Core Interfaces",
    collapsed: true,
    items: getItems([
      "Annotation",
      "AnnotationCollection",
      "AnnotationFeature",
      "AnnotationProps",
      "AnnotationType",
      "Link",
      "AnnotationOptions",
      "ControllerOptions"
    ])
  },
  {
    text: "Styling & Visual",
    collapsed: true,
    items: [
      {
        text: "Colors",
        collapsed: true,
        items: getItems([
          "Color",
          "HexColor",
          "RgbColor",
          "RgbaColor",
          "asColor",
          "asHexColor",
          "asRgbColor",
          "asRgbaColor",
          "colorToRgba",
          "hexToRgba",
          "hexShortToLong",
          "rgbToRgba",
          "adjustColorBrightness",
          "brighten",
          "darken"
        ])
      },
      {
        text: "Stroke",
        collapsed: true,
        items: getItems(["Stroke", "StrokeStyle", "StrokeOptions", "Extremity"])
      },
      {
        text: "Cursors",
        collapsed: true,
        items: getItems(["Cursor", "cursors"])
      }
    ]
  },
  {
    text: "Geometry & Math",
    collapsed: true,
    items: getItems([
      "Point",
      "Vector",
      "Bounds",
      "Rect",
      "Side",
      "SIDE_START",
      "SIDE_END",
      "getBoxPosition",
      "getBoxSize",
      "getBoxCenter",
      "getBbox",
      "setBbox",
      "updateBbox",
      "getPolygonBounds",
      "getPolygonCenter",
      "scaleGeometry",
      "scalePolygon",
      "simplifyPolygon",
      "translatePolygon",
      "updatePolygonBbox",
      "getAnnotationsBounds",
      "getCoordinates"
    ])
  },
  {
    text: "Detection & Hit Testing",
    collapsed: true,
    items: getItems([
      "detectArrow",
      "detectText",
      "detectBox",
      "detectPolygon",
      "detectComment",
      "getHandleId",
      "handleDetectionThreshold",
      "handleRadius"
    ])
  },
  {
    text: "Arrow Utilities",
    collapsed: true,
    items: getItems([
      "getArrowStart",
      "getArrowEnd",
      "getArrowEndPoints",
      "getArrowSide",
      "setArrowStart",
      "setArrowEnd",
      "setArrowEndPoint",
      "canDetachArrowStart",
      "canDetachArrowEnd",
      "canDeleteArrow",
      "getAttachmentPointOnNode",
      "addArrowToComment",
      "deleteArrowFromComment",
      "getCommentArrows",
      "getPrimaryCommentArrow",
      "isCommentArrow"
    ])
  },
  {
    text: "Comment Utilities",
    collapsed: true,
    items: getItems([
      "getCommentPosition",
      "getCommentSize",
      "getCommentZoomThreshold",
      "calculateCommentZoomThreshold",
      "getAllComments",
      "findOrphanedComments",
      "deleteCommentWithArrows",
      "toggleCommentMode",
      "validateComment"
    ])
  },
  {
    text: "Type Guards",
    collapsed: true,
    items: getItems([
      "isArrow",
      "isText",
      "isBox",
      "isPolygon",
      "isComment",
      "isAnnotationCollection",
      "isColor",
      "isHexColor",
      "isRgbColor",
      "isRgbaColor"
    ])
  },
  {
    text: "Defaults & Constants",
    collapsed: true,
    items: [
      {
        text: "Default Styles",
        collapsed: true,
        items: getItems([
          "defaultArrowStyle",
          "defaultArrowOptions",
          "defaultTextStyle",
          "defaultTextOptions",
          "defaultBoxStyle",
          "defaultBoxOptions",
          "defaultPolygonStyle",
          "defaultPolygonProperties",
          "defaultCommentStyle",
          "defaultCommentArrowStyle",
          "defaultCommentOptions"
        ])
      },
      {
        text: "Constants",
        collapsed: true,
        items: getItems([
          "DATA_ATTR",
          "DEFAULT_SEND_ICON",
          "HL_BRIGHTEN",
          "LAYERS",
          "NONE",
          "TARGET_TYPES",
          "TEXT_LINE_HEIGHT",
          "TargetType"
        ])
      }
    ]
  },
  {
    text: "Utilities",
    collapsed: true,
    items: getItems([
      "createSVGElement",
      "clientToContainerPosition",
      "getBrowserWindow",
      "migrateBoxOrTextIfNeeded",
      "debounce",
      "debounceTail",
      "throttle",
      "AnnotationGetter",
      "ClientMouseEvent",
      "Events",
      "ExportedLink",
      "Id"
    ])
  }
].filter(section => section && section.items && section.items.length > 0);

// Write the organized sidebar
fs.writeFileSync(
  sidebarPath,
  JSON.stringify(organizedSidebar, null, 2)
);

console.log('✅ Sidebar organized successfully!');
console.log(`📝 ${organizedSidebar.length} top-level sections created`);
