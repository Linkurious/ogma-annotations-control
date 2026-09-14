# Interface: TextProperties

## Extends

- `Omit`\<[`BoxProperties`](BoxProperties.md), `"type"`\>

## Properties

### author?

```ts
optional author: string;
```

Author/signature line shown under the content when `style.showAuthor`
is true. Set by the host app (via `properties.author` at creation or
`control.update()`) - no built-in UI writes this string.

***

### content

```ts
content: string;
```

text to display

***

### height

```ts
height: number;
```

Height of the text box

### style?

```ts
optional style: TextStyle;
```

Style options for the box

### type

```ts
type: "text";
```

***

### width

```ts
width: number;
```

Width of the text box

