# Type Alias: AuthorLineStyle

```ts
type AuthorLineStyle = Pick<TextStyle, "font" | "fontSize" | "color" | "fontWeight">;
```

Style overrides for the author line rendered under a Text's content
when `showAuthor` is true and `properties.author` is non-empty. Only
the line-level subset of `TextStyle` - box properties (background,
padding, borderRadius...) don't apply to it.
