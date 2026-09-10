// Builds this package's dist/types - see ../../../scripts/build-dts.mjs for
// how and why. Every cross-package specifier below (most importantly
// `@linkurious/ogma-annotations` and its `/ui` subpath) is kept `external` -
// a second, redundant guard on top of tsconfig-build.json's own `paths: {}`
// (see there for which of the two actually does the work and why) against
// this package's own bundle inlining a full, separate copy of `Control`
// (and everything else those packages export) instead of just importing
// it - the exact duplication problem this whole setup exists to avoid,
// just one package over.
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { buildDts } from "../../../scripts/build-dts.mjs";

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await buildDts({
  outDir: resolve(packageDir, "dist/types"),
  entry: {
    index: resolve(packageDir, "src/index.ts"),
    ui: resolve(packageDir, "src/ui/index.ts")
  },
  // Matches vite.config.ts's own `external` list for the JS build.
  external: [
    /^@linkurious\/ogma($|\/)/,
    /^@linkurious\/ogma-react($|\/)/,
    /^@linkurious\/ogma-annotations($|\/)/,
    /^@linkurious\/ogma-annotations-react($|\/)/,
    /^vanilla-colorful($|\/)/,
    "react",
    "react-dom"
  ],
  tsconfig: resolve(packageDir, "tsconfig-build.json")
});
