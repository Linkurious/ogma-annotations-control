// Builds this package's dist/types - see ../../../scripts/build-dts.mjs for
// how and why.
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
  external: [/^@linkurious\/ogma($|\/)/, /^vanilla-colorful($|\/)/]
});
