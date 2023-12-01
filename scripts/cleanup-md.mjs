import { marked } from 'marked';
import fs from 'fs/promises';


const toDelete = [
  '## Hierarchy',
  '## Table of contents',
  '### \\_',
  `#### Defined in`,
  `#### Inherited from`,
];

function getTitles(content, title) {
  return [...content.matchAll(new RegExp(`(^${title} .*)`, 'gm'))];
}
function getTitle(content, title) {
  return content.match(new RegExp(`(^${title}$)`, 'm'));
}


function removePrivateProperties(content) {
  const properties = getTitle(content, '## Properties');
  if (!properties) return content;
  const nextTitle = [...getTitles('#'), getTitles('##')]
    .sort((a, b) => a.index - b.index)
    .find(t => t.index > properties.index);
  const nextTitleIndex = nextTitle ? nextTitle.index : content.length;
  return content.slice(0, properties.index)
    .concat(content.slice(properties.index, nextTitleIndex)
      .replaceAll(/### (.*)\n\n• `Private`(.*)\n/gm, ''))
    .concat(content.slice(nextTitleIndex));
}
function cleanupFile(src) {
  return fs.readFile(src, 'utf-8')
    .then(content => {
      ['#', '##', '###', '####']
        .forEach((title, i, arr) => {
          const higherTitles = [];
          for (let j = 0; j < i; j++) {
            higherTitles.push(...getTitles(content, arr[j]));
          }
          higherTitles.sort((a, b) => a.index - b.index);
          const titles = getTitles(content, title);
          titles.slice().reverse().forEach((t, i, revTitles) => {
            const title = t[0];
            const match = toDelete.find(td => title.startsWith(td));
            if (!match) return;
            const nextSameTitle = i > 0 ? revTitles[i - 1] : null;
            const nextHigherTitle = higherTitles.find(ht => ht.index > t.index);
            const nexTitle = nextSameTitle && nextHigherTitle ?
              nextSameTitle.index < nextHigherTitle.index
                ? nextSameTitle
                : nextHigherTitle
              : nextHigherTitle ? nextHigherTitle : nextSameTitle;
            const nextTitleIndex = nexTitle ? nexTitle.index : content.length;
            content = content.slice(0, t.index).concat(content.slice(nextTitleIndex));
          });
        });

      // remove everything before first title:
      const firstTitle = getTitles(content, '#')[0];
      if (firstTitle) {
        content = content.slice(firstTitle.index);
        content = content.replace(/# Class: (.*)/, `# $1`);
      }
      // remove private properties
      content = removePrivateProperties(content);
      return content;
    })
    .then((parsed) => {
      return fs.writeFile(src, parsed);
    });
}


// recursively go into input dir and call cleanupFile on every md file
function cleanupDir(dir) {
  return fs.readdir(dir, { withFileTypes: true })
    .then(files => {
      const promises = files.map(file => {
        if (file.isDirectory()) {
          return cleanupDir(`${dir}/${file.name}`);
        } else if (file.name.endsWith('.md')) {
          return cleanupFile(`${dir}/${file.name}`);
        }
      });
      return Promise.all(promises);
    });
}

cleanupDir('docs/annotations');