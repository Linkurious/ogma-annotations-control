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

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sidebarPath = path.resolve(
  __dirname,
  "../../../docs/api/typedoc-sidebar.json"
);

// Read the generated sidebar
const sidebar = JSON.parse(fs.readFileSync(sidebarPath, "utf-8"));

// Extract all items into a flat map for easy lookup
const itemMap = new Map();

function extractItems(items, category) {
  items.forEach((item) => {
    itemMap.set(item.text, { ...item, category });
  });
}

sidebar.forEach((section) => {
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
  return names.map((name) => getItem(name)).filter(Boolean);
}

// Build the new organized sidebar
const organizedSidebar = [
  {
    text: "Core",
    collapsed: false,
    items: [
      getItem("Control"),
      {
        text: "Events",
        link: "/../../docs/api/type-aliases/FeatureEvents.md",
        collapsed: true,
        items: [
          {
            text: "select",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#select"
          },
          {
            text: "unselect",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#unselect"
          },
          {
            text: "add",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#add"
          },
          {
            text: "remove",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#remove"
          },
          {
            text: "update",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#update"
          },
          {
            text: "link",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#link"
          },
          {
            text: "cancelDrawing",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#cancelDrawing"
          },
          {
            text: "completeDrawing",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#completeDrawing"
          },
          {
            text: "history",
            link: "/../../docs/api/type-aliases/FeatureEvents.md#history"
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
        items: getItems([
          "Arrow",
          "ArrowProperties",
          "ArrowStyles",
          "createArrow"
        ])
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
        items: getItems([
          "Polygon",
          "PolygonProperties",
          "PolygonStyle",
          "createPolygon"
        ])
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
          "CommentTarget"
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
      }
    ]
  },
  {
    text: "Geometry & Math",
    collapsed: true,
    items: getItems([
      "Point",
      "Bounds",
      "Side",
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
          "DEFAULT_SEND_ICON",
          "TARGET_TYPES",
          "TEXT_LINE_HEIGHT",
          "SIDE_START",
          "SIDE_END",
          "TargetType"
        ])
      }
    ]
  },
  {
    text: "Utilities",
    collapsed: true,
    items: getItems([
      "clientToContainerPosition",
      "AnnotationGetter",
      "ClientMouseEvent",
      "Events",
      "ExportedLink",
      "Id"
    ])
  }
].filter((section) => section && section.items && section.items.length > 0);

// Write the organized sidebar
fs.writeFileSync(sidebarPath, JSON.stringify(organizedSidebar, null, 2));

// eslint-disable-next-line no-console
console.log("✅ Sidebar organized successfully!");
// eslint-disable-next-line no-console
console.log(`📝 ${organizedSidebar.length} top-level sections created`);
