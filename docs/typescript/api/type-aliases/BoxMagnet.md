# Type Alias: BoxMagnet

```ts
type BoxMagnet = object;
```

Arrow snapped to a rectangular annotation (text, box, comment).
nx/ny are center-relative fractions multiplied by width/height:
  left-center  = { nx: -0.5, ny: 0 }
  right-center = { nx:  0.5, ny: 0 }
  center       = { nx:  0,   ny: 0 }

## Properties

### nx

```ts
nx: number;
```

***

### ny

```ts
ny: number;
```

***

### type

```ts
type: "box";
```
