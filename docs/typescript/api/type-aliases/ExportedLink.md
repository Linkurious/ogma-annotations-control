# Type Alias: ExportedLink

```ts
type ExportedLink = object;
```

Serialized link stored inside arrow.properties.link.
Uses plain { x, y } for backward compatibility with saved annotations.
Converted to the internal Magnet type by Links.add().

## Properties

### id

```ts
id: Id;
```

***

### magnet?

```ts
optional magnet: Point;
```

***

### side

```ts
side: Side;
```

***

### type

```ts
type: TargetType;
```
