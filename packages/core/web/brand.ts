import type Ogma from "@linkurious/ogma";
import type { BrandOptions } from "@linkurious/ogma";
import pkg from "../package.json";

/** Shows the plugin name/version and a link back to the docs, using Ogma's
 * brand API. Bottom-right by default - stays clear of every demo's own
 * top-left instructions box and the lil-gui panel docked top-right. */
export function installBrand(
  ogma: Ogma,
  position: BrandOptions["position"] = "bottom-right"
) {
  ogma.tools.brand.set(
    `<div class="brand">
      <a href="../api/"><code>ogma-annotations</code></a> v${pkg.version} |
      <a href="https://github.com/linkurious/ogma-annotations-control/tree/develop/packages/core/web/">code</a> |
      <a href="../">docs</a>
    </div>`,
    {
      position,
      horizontalMargin: 10,
      verticalMargin: 10,
      className: "brand"
    }
  );
}
