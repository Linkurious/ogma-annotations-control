import { DefaultTheme, defineConfig } from 'vitepress';
import fs from 'fs/promises';

// recursively go into input dir and create a vitepress sidebar config
function createSidebar(dir) {
  return fs.readdir(dir, { withFileTypes: true })
    .then(files => {
      const promises = files.map(file => {
        if (file.isDirectory()) {
          return createSidebar(`${dir}/${file.name}`);
        } else if (file.name.endsWith('.md')) {
          return {
            text: file.name.replace('.md', ''),
            link: `${dir.replace('docs/', '')}/${file.name.replace('.md', '')}`,
          };
        }
      });
      return Promise.all(promises);
    })
    .then(res => {
      return res.filter(r => r);
    });
}
const classes = await createSidebar('docs/annotations/classes');
const interfaces = await createSidebar('docs/annotations/interfaces');
const sidebar: DefaultTheme.Sidebar = {
  'annotations/': [
    {
      text: 'Classes',
      items: classes,
    },
    {
      text: 'Interfaces',
      items: interfaces,
    },
    {
      text: 'Misc',
      link: 'annotations/modules'
    },
  ],
};
// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Ogma annotations",
  description: "A plugin to draw annotations on top of Ogma",
  head: [['link', { rel: 'icon', href: '/ogma-annotations-control/favicon.ico' }]],
  base: '/ogma-annotations-control/',
  ignoreDeadLinks: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
    ],
    outline: {
      level: [2, 3]
    },
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Linkurious/ogma-annotations-control' }
    ]
  }
});
