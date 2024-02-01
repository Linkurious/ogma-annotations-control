import Textbox from '@borgar/textbox';
import { Text } from '../../types';
import { getTextSize } from '../../utils';

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

  const lines = box.linebreak(
    annotation.properties.content.replaceAll('\n', '<br>')
  );
  // Destination canvas is set to the height of the output
  const text = lines.render();

  text.setAttribute('transform', `translate(${padding}, ${padding})`);
  g.appendChild(text);
}
