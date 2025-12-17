import { DefaultTheme, defineConfig } from "vitepress";
import path from "path";
import fs from "fs/promises";

// recursively go into input dir and create a vitepress sidebar config
async function createSidebar(dir: string): Promise<DefaultTheme.SidebarItem[]> {
  return fs
    .readdir(dir, { withFileTypes: true })
    .then((files) => {
      const promises = files.map((file) => {
        if (file.isDirectory()) {
          return createSidebar(`${dir}/${file.name}`);
        } else if (file.name.endsWith(".md")) {
          console.log(`${dir}/${file.name}`);
          return {
            text: file.name.replace(".md", ""),
            link: `${dir.replace("docs/", "")}/${file.name.replace(".md", "")}`
          } as DefaultTheme.SidebarItem;
        }
      });
      return Promise.all(promises);
    })
    .then((res) => res.filter((r) => r));
}
const classes = await createSidebar("docs/api/classes");
const interfaces = await createSidebar("docs/api/interfaces");
const sidebar: DefaultTheme.Sidebar = {
  "api/": [
    {
      text: "Classes",
      items: classes
    },
    {
      text: "Interfaces",
      items: interfaces
    },
    {
      text: "Misc",
      link: "api/modules"
    }
  ]
};
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
    nav: [
      { text: "Home", link: "/" },
      { text: "Demo", link: "/demo/index.html", target: "_blank" },
      { text: "React Demo", link: "/demo-react/index.html", target: "_blank" }
    ],
    outline: {
      level: [2, 3]
    },
    sidebar,
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Linkurious/ogma-annotations-control"
      }
    ]
  }
});
