import '@linkurious/ogma-annotations/style.css';
import { useAnnotationsContext } from "../src/AnnotationsContext";
import { useEffect, useState } from "react";
import { ButtonGroup, Button, Slider, Select } from '@geist-ui/react';
import { DirectionNone } from './icons/direction-none';
import { Layer } from "../src/Layer";
import './UI.css';
import { DirectionBoth } from './icons/direction-both';
import { DirectionOne } from './icons/direction-one';
import { interpolate, normalize } from '../src/utils';
import { ArrowStyles, createArrow, createText, isArrow, isText } from '@linkurious/ogma-annotations';
import { useOgma } from '@linkurious/ogma-react';
const defaultColors = [
  "#FFFFFF",
  "#F44E3B",
  "#FE9200",
  "#FCDC00",
  "#A4DD00",
  "#68CCCA",
  "#73D8FF",
  "#AEA1FF",
  "#1E88E5",
  "#333333",
  "#808080",
  "#cccccc",
];
const fonts = [
  // normal serif monospace
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'monospace', label: 'Monospace' },
];
const sizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 48, 64, 72].map(v => ({ value: `${v}`, label: v }));

type ColorPickerProps = {
  color?: string;
  setColor?: (c: string) => void;
};
const ColorPicker = ({ color, setColor }: ColorPickerProps) => {
  const [colors] = useState(defaultColors);
  const [selected, setSelected] = useState(color);
  return (
    <span className='colorpicker'>
      {colors.map(c => {
        return (<div
          key={c}
          className={c === selected ? 'selected' : ''}
          style={{
            width: 12,
            height: 12,
            borderRadius: 10,
            backgroundColor: c,
            margin: 5,
            cursor: 'pointer',
          }}
          onClick={() => { setSelected(c); setColor && setColor(c); }}
        />);
      })}
    </span>
  );

};


const MenuAdd = (
) => {
  const { editor, arrowStyle, textStyle } = useAnnotationsContext();
  const ogma = useOgma();
  function addAnnotation(type: 'arrow' | 'text') {
    const opts = ogma.getOptions();
    ogma.setOptions({ cursor: { default: 'crosshair' } });
    ogma.events.once('click', (evt) => {
      const { x, y } = ogma.view.screenToGraphCoordinates(evt);
      const annotation = type === 'arrow' ? createArrow(x, y, x, y, {
        strokeWidth: arrowStyle.strokeWidth,
        strokeColor: arrowStyle.strokeColor,
        strokeType: 'plain'
      }) : createText(x, y, 0, 0, '...', {
        strokeWidth: arrowStyle.strokeWidth,
        strokeColor: arrowStyle.strokeColor,
        strokeType: 'plain'
      });
      setTimeout(() => {
        if (isArrow(annotation)) {
          editor.startArrow(x, y, annotation);
        }
        if (isText(annotation)) {
          editor.startText(x, y, annotation);
        }
      }, 50);
      editor.once('add', () => {
        ogma.setOptions(opts);
      });
    });
  }
  return (
    <span>
      <Button onClick={() => addAnnotation('arrow')}>
        Add arrow
      </Button>
      <Button onClick={() => addAnnotation('text')}>
        Add text
      </Button>
    </span >
  );
};



export const UI = (
) => {
  const { currentAnnotation, arrowStyle, setArrowStyle, textStyle, setTextStyle } = useAnnotationsContext();
  function setExt(arrowStyle: ArrowStyles, ext: 'one' | 'none' | 'both') {
    const style: ArrowStyles = {
      head: 'none',
      tail: 'none',
    };
    if (ext === 'one') {
      style.head = 'arrow';
    }
    if (ext === 'both') {
      style.head = 'arrow';
      style.tail = 'arrow';
    }
    setArrowStyle({ ...arrowStyle, ...style });
  }
  const minThickness = 0.1;
  const maxThickness = 10;
  function setWidth(w: number) {
    const strokeWidth = interpolate(normalize(w, 0, 100), minThickness, maxThickness);
    setArrowStyle({ ...arrowStyle, strokeWidth });
  }
  function setColor(strokeColor: string) {
    setArrowStyle({ ...arrowStyle, strokeColor });
  }
  function setFont(font: string) {
    setTextStyle({ ...textStyle, font });
  }
  function setSize(f: string) {
    setTextStyle({ ...textStyle, fontSize: `${f}px` });
  }
  function setBgColor(background: string) {
    setTextStyle({ ...textStyle, background });
  }
  function setTextColor(color: string) {
    setTextStyle({ ...textStyle, color });
  }
  function stopEvent(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }


  // <Layer>
  return (
    <Layer>
      <>
        <MenuAdd />

        <div className='ui' onMouseUp={stopEvent} onMouseDown={stopEvent} onClick={stopEvent}>
          {
            currentAnnotation &&
            isArrow(currentAnnotation) &&
            (
              <span className='rows'>
                <ButtonGroup>
                  <Button onClick={() => setExt('none')} icon={<DirectionNone />}></Button>
                  <Button onClick={() => setExt('one')} icon={<DirectionOne />}></Button>
                  <Button onClick={() => setExt('both')} icon={<DirectionBoth />}></Button>
                </ButtonGroup>
                <ColorPicker color={arrowStyle.strokeColor} setColor={c => setColor(c)} />
                <Slider min={0} max={100} onChange={val => setWidth(val)}
                  initialValue={Math.floor(interpolate(normalize(arrowStyle.strokeWidth, minThickness, maxThickness), 0, 100))} />
              </span>
            )
          }
          {
            currentAnnotation &&
            isText(currentAnnotation) &&
            (
              <span className='rows'>
                <Select onChange={f => setFont(f as string)}
                  initialValue={textStyle.font}
                >
                  {
                    fonts.map(f => <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>)
                  }
                </Select>
                <Select onChange={s => setSize(s as string)}
                  initialValue={textStyle.fontSize}
                >
                  {
                    sizes.map(s => <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>)
                  }
                </Select>
                <ColorPicker color={textStyle.color} setColor={c => setTextColor(c)} />
                <ColorPicker color={textStyle.background} setColor={c => setBgColor(c)} />
              </span>
            )
          }
        </div>
      </>
    </Layer>
  );
};


