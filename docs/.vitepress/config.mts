import { DefaultTheme, defineConfig } from "vitepress";
import path from "path";
import fs from "fs/promises";
import sidebarJSON from "../api/typedoc-sidebar.json";

function cleanBasePaths(items: DefaultTheme.SidebarItem[]) {
  for (const item of items) {
    if ("link" in item && item.link) {
      item.link = item.link.replace("/../../docs/api/", "/api/");
    }
    if ("items" in item && item.items) {
      cleanBasePaths(item.items);
    }
  }
  return items;
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Ogma annotations",
  description: "A plugin to draw annotations on top of Ogma",
  head: [
    ["link", { rel: "icon", href: "/ogma-annotations-control/favicon.ico" }]
  ],
  outDir: path.resolve(process.cwd(), "dist"),
  base: "/ogma-annotations-control/",
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "https://doc.linkurious.com/ogma/latest/logo-white.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "API", link: "/api/index.html" },
      {
        text: "Demo",
        items: [
          { text: "Typescript", link: "/demo/index.html", target: "_blank" },
          {
            text: "React",
            link: "/demo-react/index.html",
            target: "_blank"
          }
        ]
      }
    ],
    outline: {
      level: [2, 3]
    },
    sidebar: [{ text: "API", items: cleanBasePaths(sidebarJSON) }],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Linkurious/ogma-annotations-control"
      }
    ],
    search: {
      provider: "local"
    }
  }
});
