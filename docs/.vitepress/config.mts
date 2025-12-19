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
  title: "Ogma Annotations",
  titleTemplate: ":title",
  description: "A plugin to draw annotations on top of Ogma",
  head: [
    ["link", { rel: "icon", href: "/ogma-annotations-control/favicon.ico" }]
  ],
  outDir: path.resolve(process.cwd(), "dist"),
  base: "/ogma-annotations-control/",
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: {
      light: "https://doc.linkurious.com/ogma/latest/logo-white.svg",
      dark: "https://doc.linkurious.com/ogma/latest/logo.svg"
    },
    siteTitle: false, // Hide title text, show only logo
    nav: [
      { text: "API", link: "/api/index.html" },
      { text: "Docs", link: "/typescript/installation.html" },
      { text: "React", link: "/react/installation.html" },
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
    sidebar: {
      // TypeScript documentation
      "/typescript/": [
        {
          text: "Guide",
          items: [
            { text: "Installation & Setup", link: "/typescript/installation" },
            {
              text: "Core Concepts",
              collapsed: false,
              items: [
                {
                  text: "Controller",
                  link: "/typescript/core-concepts/controller"
                },
                {
                  text: "Annotations",
                  link: "/typescript/core-concepts/annotations"
                },
                { text: "Events", link: "/typescript/core-concepts/events" }
              ]
            },
            {
              text: "Creating Annotations",
              collapsed: false,
              items: [
                {
                  text: "Programmatically",
                  link: "/typescript/creating-annotations/programmatic"
                },
                {
                  text: "Interactive Creation",
                  link: "/typescript/creating-annotations/interactive"
                }
              ]
            },
            {
              text: "Styling",
              collapsed: false,
              items: [
                {
                  text: "Arrow Styles",
                  link: "/typescript/styling/arrow-styles"
                },
                { text: "Text Styles", link: "/typescript/styling/text-styles" }
              ]
            },
            {
              text: "Managing Annotations",
              collapsed: false,
              items: [
                { text: "Selection", link: "/typescript/managing/selection" },
                {
                  text: "Modification",
                  link: "/typescript/managing/modification"
                },
                { text: "Deletion", link: "/typescript/managing/deletion" }
              ]
            }
          ]
        },
        {
          text: "API Reference",
          items: [{ text: "Full API Documentation", link: "/api/" }]
        }
      ],

      // React documentation
      "/react/": [
        {
          text: "React Guide",
          items: [
            { text: "Installation & Setup", link: "/react/installation" },
            {
              text: "Core Concepts",
              collapsed: false,
              items: [
                {
                  text: "AnnotationsContextProvider",
                  link: "/react/core-concepts/provider"
                },
                {
                  text: "useAnnotationsContext Hook",
                  link: "/react/core-concepts/hooks"
                }
              ]
            },
            {
              text: "Creating Annotations",
              collapsed: false,
              items: [
                {
                  text: "Interactive Creation",
                  link: "/react/creating-annotations/interactive"
                },
                {
                  text: "Programmatic Creation",
                  link: "/react/creating-annotations/programmatic"
                }
              ]
            },
            {
              text: "Styling",
              collapsed: false,
              items: [
                { text: "Arrow Styles", link: "/react/styling/arrow-styles" },
                { text: "Text Styles", link: "/react/styling/text-styles" }
              ]
            },
            {
              text: "Building UI Components",
              collapsed: false,
              items: [
                { text: "Toolbar", link: "/react/ui-components/toolbar" },
                {
                  text: "Style Panel",
                  link: "/react/ui-components/style-panel"
                },
                {
                  text: "Annotation List",
                  link: "/react/ui-components/annotation-list"
                }
              ]
            }
          ]
        },
        {
          text: "Examples",
          items: [
            { text: "Simple Toolbar", link: "/examples/react/simple-toolbar" },
            { text: "Full Editor", link: "/examples/react/full-editor" },
            { text: "Advanced", link: "/examples/react/advanced" }
          ]
        }
      ],

      // Examples section
      "/examples/": [
        {
          text: "TypeScript Examples",
          items: [
            { text: "Basic Usage", link: "/examples/typescript/basic" },
            {
              text: "Custom Styling",
              link: "/examples/typescript/custom-styling"
            },
            {
              text: "Event Handling",
              link: "/examples/typescript/event-handling"
            }
          ]
        },
        {
          text: "React Examples",
          items: [
            { text: "Simple Toolbar", link: "/examples/react/simple-toolbar" },
            { text: "Full Editor", link: "/examples/react/full-editor" },
            { text: "Advanced", link: "/examples/react/advanced" }
          ]
        }
      ],

      // API documentation (TypeDoc generated)
      "/api/": [{ text: "API Reference", items: cleanBasePaths(sidebarJSON) }],

      // Getting Started and other root pages
      "/": [
        {
          text: "Getting Started",
          items: [{ text: "Introduction", link: "/getting-started" }]
        },
        {
          text: "TypeScript",
          items: [
            { text: "Installation", link: "/typescript/installation" },
            {
              text: "Core Concepts",
              link: "/typescript/core-concepts/controller"
            }
          ]
        },
        {
          text: "React",
          items: [
            { text: "Installation", link: "/react/installation" },
            { text: "Core Concepts", link: "/react/core-concepts/provider" }
          ]
        }
      ]
    },
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
