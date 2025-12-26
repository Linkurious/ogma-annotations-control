# Function: simplifyPolygon()

```ts
function simplifyPolygon(
   points, 
   tolerance, 
   highestQuality): Position[];
```

Polyline simplification using a combination of
the Radial Distance and
the Douglas-Peucker algorithms
See https://github.com/mourner/simplify-js for more details

## Parameters

### points

`Position`[]

Points to simplify

### tolerance

`number`

Tolerance in pixels

### highestQuality

`boolean`

Whether to skip radial distance simplification

## Returns

`Position`[]

Simplified points
