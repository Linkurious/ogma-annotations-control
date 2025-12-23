# Function: createPolygon()

```ts
function createPolygon(coordinates, properties?): Polygon;
```

Create a polygon annotation

## Parameters

### coordinates

\[`number`, `number`\][][]

### properties?

`Partial`\<`Omit`\<[`PolygonProperties`](../interfaces/PolygonProperties.md), `"type"`\>\> & `object`

## Returns

[`Polygon`](../interfaces/Polygon.md)
