// Shared by each package's own scripts/build-types.mjs (core, react) - see
// either for the fuller "why". In short: builds a package's `dist/types` as
// a real, *chunked* declaration bundle via `rollup-plugin-dts` - Rollup's
// own multi-entry code-splitting (the same mechanism that gives the JS
// build its shared `Polygon-*.js` chunk) applied to `.d.ts`, instead of
// `vite-plugin-dts`'s `rollupTypes: true` bundling each entry point
// standalone (which was the original cause of the cross-entry `Control`
// type incompatibility this setup exists to avoid).
import { rollup } from "rollup";
import dts from "rollup-plugin-dts";

// `import "./style.css"`-style side-effect imports have nothing to
// contribute to a declaration bundle.
const ignoreCss = {
  name: "ignore-css",
  load(id) {
    if (id.endsWith(".css")) return "";
  }
};

/**
 * @param {object} options
 * @param {string} options.outDir - where to write the bundle, e.g.
 *   `<packageDir>/dist/types`.
 * @param {Record<string, string>} options.entry - entry name -> source file,
 *   e.g. `{ index: ".../src/index.ts", ui: ".../src/ui/index.ts" }`.
 * @param {(string | RegExp)[]} options.external - runtime/cross-package
 *   specifiers to keep as plain imports rather than inline - should match
 *   the package's own vite.config.ts `external` list (plus, for a package
 *   that depends on another workspace package's types, that package's own
 *   specifiers - leaving those out is what silently inlines a duplicate
 *   copy of whatever they export).
 * @param {string} [options.tsconfig] - explicit tsconfig path; omit to let
 *   rollup-plugin-dts auto-detect the nearest tsconfig.json.
 */
export async function buildDts({ outDir, entry, external, tsconfig }) {
  const bundle = await rollup({
    input: entry,
    external,
    plugins: [ignoreCss, dts(tsconfig ? { tsconfig } : {})],
    // rollup-plugin-dts warns (rather than errors) when something got
    // walked into the bundle without a clean public re-export - exactly
    // what an incomplete `external` list produces (missing a cross-package
    // specifier silently inlines a duplicate copy of whatever it exports,
    // the same bug this whole setup exists to avoid). Fail the build
    // instead of letting that warning scroll by unnoticed.
    onwarn(warning) {
      throw new Error(
        `${warning.code ?? "rollup"}: ${warning.message}\n` +
          "Declaration build produced a warning - treating as fatal " +
          "(see scripts/build-dts.mjs onwarn)."
      );
    }
  });
  await bundle.write({ dir: outDir, format: "es" });
  await bundle.close();
}
