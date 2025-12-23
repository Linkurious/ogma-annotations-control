# Core concepts

This section covers the fundamental concepts of using `@linkurious/ogma-annotations` in a TypeScript project.

## [Controller](./controller.md)

This is the maon class that manages annotations. All the functionality is exposed through the controller. It manages renderering, state and user interactions.

- [Docs and usage](/typescript/core-concepts/controller.md)

## [Annotation Types](./annotations.md)

Supported annotations types and their JSON representations.

- [Docs and usage](/typescript/core-concepts/annotations.md)

## [Events](./events.md)

In order to react to user interactions and changes in the annotations, the controller emits events. You can listen to these events to perform custom actions.

- [Docs and usage](./events.md)

## Renderer

Ogma anntotations come with the default SVG renderer for drawing annotations on the graph. SVG is chosen for high-quality rendering and exports. You cannot access the renderer directly, but you can customize the appearance of the annotations.

## State Management

Plugin manages the state of annotations internally, allowing you to focus on creating and manipulating annotations without worrying about low-level state handling. It provides useful methods to do undo/redo changes, manage history, and persist state. They are exposed through the controller.
