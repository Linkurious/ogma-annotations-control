import Ogma, { Point } from '@linkurious/ogma';
import {
  createText,
  defaultControllerOptions,
  defaultOptions,
  defaultStyle
} from './defaults';
import drawText from './render';
import {
  EVT_DRAG,
  EVT_DRAG_END,
  EVT_DRAG_START,
  EVT_UPDATE,
  NONE
} from '../../constants';
import { ControllerOptions, Id, Text } from '../../types';
import {
  createSVGElement,
  getHandleId,
  getTextPosition,
  getTextSize,
  setTextBbox
} from '../../utils';
import Editor from '../base';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const minSize = 20;

/**
 * @class Texts
 * Draw, update, edit texts
 */
export class Texts extends Editor<Text> {
  private textArea: HTMLTextAreaElement;
  private handleSize: number;
  private rect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  private annotation: Text = { ...defaultOptions };
  private startX = 0;
  private startY = 0;
  private handles: HTMLDivElement[] = [];
  private draggedHandle = NONE;
  private isFocused = false;
  private placeholder = 'Type your text here...';

  constructor(
    ogma: Ogma,
    options: Pick<
      Partial<ControllerOptions>,
      'textHandleSize' | 'textPlaceholder'
    > = {}
  ) {
    super(
      ogma,
      `
    <div class="annotation-text-handle">
      <span class="handle line-handle top" data-handle-id="0"></span>
      <span class="handle line-handle bottom" data-handle-id="1"></span>
      <span class="handle line-handle left" data-handle-id="2"></span>
      <span class="handle line-handle right" data-handle-id="3"></span>
      <span class="handle top right point-handle top-right" data-handle-id="4"></span>
      <span class="handle left top point-handle top-left" data-handle-id="5"></span>
      <span class="handle bottom right point-handle bottom-right" data-handle-id="6"></span>
      <span class="handle left bottom left-handle point-handle bottom-left" data-handle-id="7"></span>
      <textarea wrap="off"></textarea>
    </div>
  `
    );
    this.handleSize = (defaultControllerOptions.handleSize ||
      options.textHandleSize) as number;
    this.placeholder =
      defaultControllerOptions.placeholder || options.textPlaceholder || '';

    // hidden text input to edit the text, we swap it with SVG when selected or hovered
    const textArea = (this.textArea =
      this.editor.element.querySelector<HTMLTextAreaElement>('textarea')!);
    textArea.addEventListener('input', this._onInput);
    textArea.addEventListener('focus', this._onFocus);
    textArea.addEventListener('blur', this._onBlur);
    textArea.spellcheck = false;

    this.handles = Array.prototype.slice.call(
      this.editor.element.querySelectorAll('.annotation-text-handle > .handle')
    );

    // events to move/resize
    this.handles.forEach((handle: HTMLDivElement) =>
      handle.addEventListener('mousedown', this.onHandleMouseDown)
    );

    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove, true);
    // update the width of the controls depending on zoom
    ogma.events.on(['viewChanged', 'zoom'], this.onViewChanged);
  }

  private _onFocus = () => {
    if (this.textArea.value === this.placeholder) this.textArea.value = '';
    this.isFocused = true;
  };

  private _onBlur = () => {
    this.isFocused = false;
  };

  protected _canRemove() {
    return !this.isFocused;
  }

  public startDrawing = (
    x: number,
    y: number,
    text = createText(x, y, 0, 0, '', defaultStyle)
  ) => {
    this.add(text);
    const pos = this.ogma.view.graphToScreenCoordinates({ x, y });
    this.select(text.id);
    this.startDragging(this.getById(text.id), pos.x, pos.y);
    this.draggedHandle = 6;
  };

  public cancelDrawing = () => {
    if (!this.isDragging) return;
    this.remove(this.annotation.id);
    this.annotation = { ...defaultOptions };
    this.draggedHandle = NONE;
    this.isDragging = false;
    this.emit(EVT_DRAG_END, this.annotation);
  };

  private startDragging = (text: Text, clientX: number, clientY: number) => {
    this.annotation = text;
    const position = getTextPosition(this.annotation);
    const size = getTextSize(this.annotation);

    this.rect.x = position.x;
    this.rect.y = position.y;
    this.rect.width = size.width;
    this.rect.height = size.height;

    this.startX = clientX;
    this.startY = clientY;
    this.disableDragging();
    this.textArea.classList.add('noevents');
    this.textArea.setAttribute('disabled', 'disabled');
    this.emit(EVT_DRAG_START, this.annotation);
    this.isDragging = true;
  };

  private onHandleMouseDown = (evt: MouseEvent) => {
    const res = this.getById(this.selectedId) || this.getById(this.hoveredId);
    if (!res) return;
    if (this.selectedId !== res.id) this.select(this.hoveredId);

    this.startDragging(res, evt.clientX, evt.clientY);
    this.draggedHandle = getHandleId(evt.target as HTMLDivElement);
  };

  private onMouseMove = (evt: MouseEvent) => {
    requestAnimationFrame(() => this._onMouseMove(evt));
  };

  private _onMouseMove = (evt: MouseEvent) => {
    if (!this.isDragging) return;

    evt.stopPropagation();
    evt.preventDefault();

    const handle = this.handles[this.draggedHandle];

    const isTop = handle.classList.contains('top');
    const isLeft = handle.classList.contains('left');
    const isRight = handle.classList.contains('right');
    const isBottom = handle.classList.contains('bottom');
    const isLine = handle.classList.contains('line-handle');

    const zoom = this.ogma.view.getZoom();
    const dx = (evt.clientX - this.startX) / zoom;
    const dy = (evt.clientY - this.startY) / zoom;
    const x = isLeft || isLine ? this.rect.x + dx : this.rect.x;
    const y = isTop || isLine ? this.rect.y + dy : this.rect.y;
    const width = Math.max(
      this.rect.width + dx * (isLine ? 0 : isLeft ? -1 : isRight ? 1 : 0),
      minSize
    );
    const height = Math.max(
      this.rect.height + dy * (isLine ? 0 : isTop ? -1 : isBottom ? 1 : 0),
      minSize
    );
    setTextBbox(this.annotation, x, y, width, height);
    this.emit(EVT_DRAG, this.annotation, 'text');

    this.refreshEditor();
    this.layer.refresh();
  };

  private onMouseUp = () => {
    if (!this.isDragging || this.draggedHandle === NONE) return;

    this.restoreDragging();
    this.textArea.classList.remove('noevents');
    this.textArea.removeAttribute('disabled');
    this.emit(EVT_DRAG_END, this.annotation);
    this.isDragging = false;
    this.draggedHandle = NONE;
  };

  private onViewChanged = () => {
    const w = Math.max(2, this.handleSize / this.ogma.view.getZoom());
    document.documentElement.style.setProperty('--handle-width', `${w}px`);
  };

  private _onInput = () => {
    const annotation = this.getById(this.selectedId);
    if (!annotation) return;
    // prevent double spaces as it is not handled by the align algo.
    //const selectionCursor = this.textArea.selectionEnd;
    this.textArea.value = this.textArea.value.replace(/ +(?= )/g, '');
    this.textArea.focus();
    //this.textArea.selectionEnd = Math.max(0, selectionCursor - 1);
    annotation.properties.content = this.textArea.value;
    this.emit(EVT_UPDATE, annotation);
    this.layer.refresh();
  };

  public detect({ x, y }: Point, margin = 0): Text | undefined {
    // check if the pointer is within the bounding box of one of the texts
    return this.elements.find((a) => {
      const { x: tx, y: ty } = getTextPosition(a);
      const { width, height } = getTextSize(a);

      return (
        tx - margin < x &&
        ty - margin < y &&
        tx + width + margin > x &&
        ty + height + margin > y
      );
    });
  }

  public draw(svg: SVGSVGElement): void {
    svg.innerHTML = '';
    const styleContent = '';
    this.elements.forEach((annotation, i) => {
      const className = `class${i}`;
      const size = getTextSize(annotation);
      const position = getTextPosition(annotation);
      const id = annotation.id;
      const {
        color,
        fontSize,
        font,
        strokeColor,
        strokeWidth,
        strokeType,
        background
      } = annotation.properties.style || defaultStyle;
      if (
        id === this.selectedId ||
        (this.selectedId === -1 && id === this.hoveredId)
      )
        return;
      const g = createSVGElement<SVGGElement>('g');
      g.setAttribute('fill', `${color}`);
      g.setAttribute('font-size', `${fontSize}`);
      g.setAttribute('font-family', `${font}`);

      // rect is used for background and stroke
      const rect = createSVGElement<SVGRectElement>('rect');
      let addRect = false;
      if (strokeType && strokeType !== 'none') {
        addRect = true;
        rect.setAttribute('stroke', strokeColor || 'black');
        rect.setAttribute('stroke-width', `${strokeWidth}`);
        if (strokeType === 'dashed') {
          rect.setAttribute('stroke-dasharray', `5,5`);
        }
      }
      if ((background && background.length) || addRect) {
        addRect = true;
        rect.setAttribute('fill', background || 'transparent');
      }
      if (addRect) {
        rect.setAttribute('width', `${size.width}`);
        rect.setAttribute('height', `${size.height}`);
      }
      g.appendChild(rect);
      drawText(annotation, g);
      g.setAttribute('transform', `translate(${position.x},${position.y})`);
      g.classList.add(className);
      g.setAttribute('data-annotation', `${annotation.id}`);
      g.setAttribute('data-annotation-type', 'text');
      svg.appendChild(g);
    });
    const style = createSVGElement<SVGStyleElement>('style');
    style.innerHTML = styleContent;
    if (!svg.firstChild) return;
    svg.insertBefore(style, svg.firstChild);
  }

  public getDefaultOptions(): Text {
    return defaultOptions;
  }

  public refreshEditor() {
    if (+this.selectedId < 0 && +this.hoveredId < 0) return;
    const t = this.getById(this.selectedId) || this.getById(this.hoveredId);
    const size = getTextSize(t);
    const position = getTextPosition(t);

    const {
      font,
      fontSize,
      color,
      background,
      padding = 0
    } = t.properties.style || defaultStyle;
    this.textArea.value = t.properties.content;
    this.editor.setPosition({ x: position.x, y: position.y });
    this.editor.setSize(size);
    //this.textArea.style.font = `${fontSize} ${font}`;
    this.textArea.style.fontFamily = font || 'sans-serif';
    this.textArea.style.fontSize = `${fontSize}px`;
    this.textArea.style.padding = `${padding}px`;
    this.textArea.style.lineHeight = `${fontSize}px`;

    this.textArea.style.boxSizing = 'border-box';
    this.textArea.style.color = color || 'black';
    this.textArea.style.background = background || 'transparent';

    this.textArea.placeholder = this.placeholder;

    this.layer.refresh();
  }

  select(id: Id): void {
    super.select(id);
    this.textArea.focus();
  }

  public destroy(): void {
    super.destroy();
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove, true);
    // update the width of the controls depending on zoom
    this.ogma.events.off(this.onViewChanged);
  }
}

export {
  defaultOptions as defaultTextOptions,
  defaultStyle as defaultTextStyle,
  defaultControllerOptions,
  createText
};