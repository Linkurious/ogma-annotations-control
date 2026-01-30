# Interface: AnnotationFeature\<G, P\>

Base interface for all annotation features.

## Extends

- `Feature`\<`G`, `P`\>

## Extended by

- [`Arrow`](Arrow.md)
- [`Box`](Box.md)
- [`Comment`](Comment.md)
- [`Polygon`](Polygon.md)
- [`Text`](Text.md)

## Type Parameters

### G

`G` *extends* `GeometryObject` = `GeometryObject`

Geometry type

### P

`P` = [`AnnotationProps`](AnnotationProps.md)

Properties type

## Properties

### bbox?

```ts
optional bbox: BBox;
```

Bounding box of the coordinate range of the object's Geometries, Features, or Feature Collections.
The value of the bbox member is an array of length 2*n where n is the number of dimensions
represented in the contained geometries, with all axes of the most southwesterly point
followed by all axes of the more northeasterly point.
The axes order of a bbox follows the axes order of geometries.
https://tools.ietf.org/html/rfc7946#section-5

### geometry

```ts
geometry: G;
```

The feature's geometry

### id

```ts
id: Id;
```

Unique identifier for the annotation

### properties

```ts
properties: P;
```

Properties associated with this feature.

### type

```ts
type: "Feature";
```

Specifies the type of GeoJSON object.

