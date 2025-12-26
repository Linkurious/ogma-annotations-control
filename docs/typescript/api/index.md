# @linkurious/ogma-annotations

## Classes

| Class | Description |
| ------ | ------ |
| [Control](classes/Control.md) | Main controller class for managing annotations. It manages rendering and editing of annotations. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AnnotationCollection](interfaces/AnnotationCollection.md) | Collection of Annotations, GeoJSON FeatureCollection |
| [AnnotationFeature](interfaces/AnnotationFeature.md) | Base interface for all annotation features. |
| [AnnotationProps](interfaces/AnnotationProps.md) | Base properties for all annotations. |
| [Arrow](interfaces/Arrow.md) | Arrow annotation feature. Represents a directed line between two points, can connect a textbox to a shape. |
| [ArrowProperties](interfaces/ArrowProperties.md) | Base properties for all annotations. |
| [ArrowStyles](interfaces/ArrowStyles.md) | Styles specific to arrow annotations. |
| [Box](interfaces/Box.md) | Box annotation feature |
| [BoxProperties](interfaces/BoxProperties.md) | Properties specific to box annotations. |
| [BoxStyle](interfaces/BoxStyle.md) | Styles specific to box annotations. |
| [Comment](interfaces/Comment.md) | Comment annotation type Geometry: Point (center position of comment box/icon) |
| [CommentProps](interfaces/CommentProps.md) | Properties for Comment annotations |
| [CommentStyle](interfaces/CommentStyle.md) | Style configuration for Comment annotations |
| [FeatureEvent](interfaces/FeatureEvent.md) | Event related to a single annotation feature |
| [FeaturesEvent](interfaces/FeaturesEvent.md) | Event related to multiple annotation features |
| [HistoryEvent](interfaces/HistoryEvent.md) | History stack change event |
| [Link](interfaces/Link.md) | Link between an arrow and a text or node |
| [Polygon](interfaces/Polygon.md) | Polygon placed on the graph, use it to highlight areas |
| [PolygonProperties](interfaces/PolygonProperties.md) | Base properties for all annotations. |
| [PolygonStyle](interfaces/PolygonStyle.md) | Styles specific to box annotations. |
| [Text](interfaces/Text.md) | Text annotation feature, represents a text box at a specific position |
| [TextProperties](interfaces/TextProperties.md) | - |
| [TextStyle](interfaces/TextStyle.md) | Styles specific to box annotations. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [Annotation](type-aliases/Annotation.md) | Union type of all Annotation features |
| [AnnotationGetter](type-aliases/AnnotationGetter.md) | Function type to get an Annotation by its id |
| [AnnotationOptions](type-aliases/AnnotationOptions.md) | - |
| [AnnotationType](type-aliases/AnnotationType.md) | Types of annotations supported |
| [Bounds](type-aliases/Bounds.md) | Bounding box object, with the following properties: - [0]: min x - [1]: min y - [2]: max x - [3]: max y |
| [ClientMouseEvent](type-aliases/ClientMouseEvent.md) | - |
| [Color](type-aliases/Color.md) | Any valid color format |
| [ControllerOptions](type-aliases/ControllerOptions.md) | Options for the annotations control |
| [DeepPartial](type-aliases/DeepPartial.md) | - |
| [ExportedLink](type-aliases/ExportedLink.md) | - |
| [Extremity](type-aliases/Extremity.md) | Extremity types for arrow annotations. |
| [FeatureEvents](type-aliases/FeatureEvents.md) | - |
| [HexColor](type-aliases/HexColor.md) | Hex color string in format #RGB or #RRGGBB |
| [Id](type-aliases/Id.md) | Unique identifier type for annotations |
| [Point](type-aliases/Point.md) | 2D coordinate |
| [RgbaColor](type-aliases/RgbaColor.md) | RGBA color string in format rgba(r, g, b, a) |
| [RgbColor](type-aliases/RgbColor.md) | RGB color string in format rgb(r, g, b) |
| [Side](type-aliases/Side.md) | - |
| [Stroke](type-aliases/Stroke.md) | Stroke style for arrow annotations |
| [StrokeOptions](type-aliases/StrokeOptions.md) | Stroke style options for annotations |
| [StrokeStyle](type-aliases/StrokeStyle.md) | - |
| [StrokeType](type-aliases/StrokeType.md) | Stroke types available for annotations |
| [TargetType](type-aliases/TargetType.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [COMMENT\_MODE\_COLLAPSED](variables/COMMENT_MODE_COLLAPSED.md) | - |
| [COMMENT\_MODE\_EXPANDED](variables/COMMENT_MODE_EXPANDED.md) | - |
| [DATA\_ATTR](variables/DATA_ATTR.md) | - |
| [DEFAULT\_SEND\_ICON](variables/DEFAULT_SEND_ICON.md) | Default send button icon (paper plane) |
| [defaultArrowOptions](variables/defaultArrowOptions.md) | Default options for creating new Arrow annotations. Contains the default arrow structure with [defaultArrowStyle](variables/defaultArrowStyle.md). |
| [defaultArrowStyle](variables/defaultArrowStyle.md) | Default style configuration for arrow annotations. |
| [defaultBoxOptions](variables/defaultBoxOptions.md) | Default options for creating new Box annotations. Contains the default box structure with [defaultBoxStyle](variables/defaultBoxStyle.md). |
| [defaultBoxStyle](variables/defaultBoxStyle.md) | Default style configuration for box annotations. |
| [defaultCommentOptions](variables/defaultCommentOptions.md) | Default options for creating new Comments. Contains the default comment configuration with [defaultCommentStyle](variables/defaultCommentStyle.md). |
| [defaultCommentStyle](variables/defaultCommentStyle.md) | Default style for Comment annotations |
| [defaultPolygonProperties](variables/defaultPolygonProperties.md) | Default polygon properties for creating new Polygon annotations. Contains the default polygon configuration with [defaultPolygonStyle](variables/defaultPolygonStyle.md). |
| [defaultPolygonStyle](variables/defaultPolygonStyle.md) | Default style configuration for polygon annotations. |
| [defaultTextOptions](variables/defaultTextOptions.md) | Default options for creating new Text annotations. Contains the default text structure with [defaultTextStyle](variables/defaultTextStyle.md). |
| [defaultTextStyle](variables/defaultTextStyle.md) | Default style configuration for text annotations. |
| [EVT\_ADD](variables/EVT_ADD.md) | - |
| [EVT\_CANCEL\_DRAWING](variables/EVT_CANCEL_DRAWING.md) | - |
| [EVT\_COMPLETE\_DRAWING](variables/EVT_COMPLETE_DRAWING.md) | - |
| [EVT\_DRAG](variables/EVT_DRAG.md) | - |
| [EVT\_DRAG\_END](variables/EVT_DRAG_END.md) | - |
| [EVT\_DRAG\_START](variables/EVT_DRAG_START.md) | - |
| [EVT\_HISTORY](variables/EVT_HISTORY.md) | - |
| [EVT\_HOVER](variables/EVT_HOVER.md) | - |
| [EVT\_LINK](variables/EVT_LINK.md) | - |
| [EVT\_REMOVE](variables/EVT_REMOVE.md) | - |
| [EVT\_SELECT](variables/EVT_SELECT.md) | - |
| [EVT\_UNHOVER](variables/EVT_UNHOVER.md) | - |
| [EVT\_UNSELECT](variables/EVT_UNSELECT.md) | - |
| [EVT\_UPDATE](variables/EVT_UPDATE.md) | - |
| [handleDetectionThreshold](variables/handleDetectionThreshold.md) | - |
| [handleRadius](variables/handleRadius.md) | - |
| [HL\_BRIGHTEN](variables/HL_BRIGHTEN.md) | - |
| [NONE](variables/NONE.md) | - |
| [SIDE\_END](variables/SIDE_END.md) | - |
| [SIDE\_START](variables/SIDE_START.md) | - |
| [TEXT\_LINE\_HEIGHT](variables/TEXT_LINE_HEIGHT.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [adjustColorBrightness](functions/adjustColorBrightness.md) | Automatically lightens or darkens a color (hex or rgba) for highlight purposes. |
| [asColor](functions/asColor.md) | Safely cast a string to a Color type with runtime validation |
| [asHexColor](functions/asHexColor.md) | Safely cast a string to a HexColor type with runtime validation |
| [asRgbaColor](functions/asRgbaColor.md) | Safely cast a string to an RgbaColor type with runtime validation |
| [asRgbColor](functions/asRgbColor.md) | Safely cast a string to an RgbColor type with runtime validation |
| [brighten](functions/brighten.md) | Brighten a color for highlight purposes. |
| [calculateCommentZoomThreshold](functions/calculateCommentZoomThreshold.md) | Calculate optimal zoom threshold for auto-collapse based on comment dimensions |
| [canDetachArrowEnd](functions/canDetachArrowEnd.md) | Check if arrow endpoint can be detached from its target |
| [canDetachArrowStart](functions/canDetachArrowStart.md) | Check if arrow start point can be detached from its source |
| [clientToContainerPosition](functions/clientToContainerPosition.md) | - |
| [colorToRgba](functions/colorToRgba.md) | - |
| [createArrow](functions/createArrow.md) | - |
| [createBox](functions/createBox.md) | - |
| [createComment](functions/createComment.md) | Create a new Comment annotation |
| [createCommentWithArrow](functions/createCommentWithArrow.md) | Create a comment with an arrow pointing to a target location |
| [createPolygon](functions/createPolygon.md) | Create a polygon annotation |
| [createText](functions/createText.md) | - |
| [darken](functions/darken.md) | Darken a color for highlight purposes. |
| [getAnnotationsBounds](functions/getAnnotationsBounds.md) | Calculate the bounds of a collection of annotations |
| [getArrowEnd](functions/getArrowEnd.md) | - |
| [getArrowEndPoints](functions/getArrowEndPoints.md) | - |
| [getArrowSide](functions/getArrowSide.md) | - |
| [getArrowStart](functions/getArrowStart.md) | - |
| [getAttachmentPointOnNode](functions/getAttachmentPointOnNode.md) | - |
| [getBbox](functions/getBbox.md) | - |
| [getBoxCenter](functions/getBoxCenter.md) | - |
| [getBoxPosition](functions/getBoxPosition.md) | - |
| [getBoxSize](functions/getBoxSize.md) | - |
| [getCommentPosition](functions/getCommentPosition.md) | Get the position (center) of a comment |
| [getCommentSize](functions/getCommentSize.md) | Get the dimensions of a comment based on its mode |
| [getCommentZoomThreshold](functions/getCommentZoomThreshold.md) | Get the effective zoom threshold for a comment Uses explicit threshold if set, otherwise calculates from dimensions |
| [getCoordinates](functions/getCoordinates.md) | - |
| [getHandleId](functions/getHandleId.md) | - |
| [getPolygonBounds](functions/getPolygonBounds.md) | Get bounding box of a polygon |
| [getPolygonCenter](functions/getPolygonCenter.md) | Get centroid (geometric center) of a polygon |
| [hexShortToLong](functions/hexShortToLong.md) | - |
| [hexToRgba](functions/hexToRgba.md) | Adds alpha channel to a hex color |
| [isAnnotationCollection](functions/isAnnotationCollection.md) | Helper to check if a feature collection is an annotation collection |
| [isArrow](functions/isArrow.md) | - |
| [isBox](functions/isBox.md) | - |
| [isColor](functions/isColor.md) | Type guard to check if a string is a valid color |
| [isComment](functions/isComment.md) | Type guard to check if an annotation is a Comment |
| [isCommentArrow](functions/isCommentArrow.md) | Check if an arrow is connected to a comment |
| [isHexColor](functions/isHexColor.md) | Type guard to check if a string is a valid hex color |
| [isPolygon](functions/isPolygon.md) | - |
| [isRgbaColor](functions/isRgbaColor.md) | Type guard to check if a string is a valid RGBA color |
| [isRgbColor](functions/isRgbColor.md) | Type guard to check if a string is a valid RGB color |
| [isText](functions/isText.md) | - |
| [parseColor](functions/parseColor.md) | - |
| [rgbToRgba](functions/rgbToRgba.md) | Adds alpha channel to an rgb color |
| [scaleGeometry](functions/scaleGeometry.md) | - |
| [scalePolygon](functions/scalePolygon.md) | Scale polygon around an origin point |
| [setArrowEnd](functions/setArrowEnd.md) | - |
| [setArrowEndPoint](functions/setArrowEndPoint.md) | - |
| [setArrowStart](functions/setArrowStart.md) | - |
| [setBbox](functions/setBbox.md) | - |
| [simplifyPolygon](functions/simplifyPolygon.md) | Polyline simplification using a combination of the Radial Distance and the Douglas-Peucker algorithms See https://github.com/mourner/simplify-js for more details |
| [toggleCommentMode](functions/toggleCommentMode.md) | Toggle comment mode between collapsed and expanded |
| [translatePolygon](functions/translatePolygon.md) | Translate (move) a polygon by dx, dy |
| [updateBbox](functions/updateBbox.md) | - |
| [updatePolygonBbox](functions/updatePolygonBbox.md) | Update bbox for a polygon |

## References

### getTextBbox

Renames and re-exports [getBbox](functions/getBbox.md)

***

### getTextPosition

Renames and re-exports [getBoxPosition](functions/getBoxPosition.md)

***

### getTextSize

Renames and re-exports [getBoxSize](functions/getBoxSize.md)

***

### setTextBbox

Renames and re-exports [setBbox](functions/setBbox.md)

***

### updateTextBbox

Renames and re-exports [updateBbox](functions/updateBbox.md)
