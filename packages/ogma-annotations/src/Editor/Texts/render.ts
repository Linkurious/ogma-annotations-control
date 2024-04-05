import Textbox from '@borgar/textbox';
import { Text } from '../../types';
import { getTextSize } from '../../utils';

function removeElipse(str: string): string {
  return str.replace(/…$/, '');
}
/**
 * @function draw
 * @param annotation the annotation to draw
 * @param g the group in which the text should be drawn
 */
export default function draw(annotation: Text, g: SVGGElement) {
  // make sure text does not overflow
  const size = getTextSize(annotation);
  const { fontSize, font, padding = 0 } = annotation.properties.style || {};

  if (size.width === size.height && size.width === 0) return;
  const box = new Textbox({
    font: `${fontSize}px/${fontSize}px ${font}`.replace(/(px)+/g, 'px'),
    width: size.width - padding * 2,
    height: size.height - padding * 2,
    align: 'left',
    valign: 'top',
    x: 0,
    overflow: 'ellipsis',
    parser: 'html',
    createElement: Textbox.createElement
  });
  box.overflowWrap('break-word');

  const lines = box.linebreak(
    annotation.properties.content.replaceAll('\n', '<br>')
  );
  const matches = annotation.properties.content.match(/(https?:\/\/.*)/gm);
  const links = matches ? matches.map(match => match.split(' ')[0]) : [];
  // Destination canvas is set to the height of the output
  const text = lines.render();
  // replace spans with links: 
  text.setAttribute('transform', `translate(${padding}, ${padding})`);

  const children = [...text.children];
  links.forEach(l => {
    let query = l;
    const toReplace = [];
    while (query.length > 0) {
      const start = children.find(e => e.children[0]
        && e.children[0].tagName === 'tspan'
        && query.startsWith(removeElipse(e.children[0].innerHTML)));
      if (!start) break;
      toReplace.push(start);
      query = query.slice(removeElipse(start.children[0].innerHTML).length);
    }

    toReplace.forEach(e => {
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      link.setAttribute('href', l);
      link.setAttribute('target', '_blank');
      link.innerHTML = e.children[0].innerHTML;
      e.children[0].innerHTML = '';
      e.children[0].appendChild(link);
    });

  });

  g.appendChild(text);
}
