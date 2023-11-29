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
import { AnnotationFeature, AnnotationProps, ArrowStyles, createArrow } from '@linkurious/ogma-annotations';
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


export const UI = (
) => {
  const { editor, arrowStyle, setArrowStyle, textStyle } = useAnnotationsContext();

  function setExt(ext: 'one' | 'none' | 'both') {
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
  };
  const minThickness = 0.1;
  const maxThickness = 10;
  function setWidth(w: number) {
    const strokeWidth = interpolate(normalize(w, 0, 100), minThickness, maxThickness);
    setArrowStyle({ ...arrowStyle, strokeWidth });
  }
  function setColor(c: string) {
    setArrowStyle({ ...arrowStyle, strokeColor: c });
  }

  let started = false;
  useEffect(() => {
    if (!editor || started) return;
    const x = 10;
    const y = 10;
    const arrow = createArrow(x, y, x, y, {
      strokeWidth: 2,
      strokeColor: '#3b3',
      strokeType: 'plain'
    });
    //control.add(arrow);
    editor.startArrow(x, y, arrow);
    started = true;
  }, [editor]);

  function stopEvent(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }


  return (
    <Layer>
      <div className='ui' onMouseUp={stopEvent} onMouseDown={stopEvent} onClick={stopEvent}>
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

        <span className='rows'>
          <Select>
            {
              fonts.map(f => <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>)
            }
          </Select>
          <Select>
            {
              sizes.map(f => <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>)
            }
          </Select>
          {/* <ColorPicker /> */}
          {/* <ColorPicker /> */}
        </span>
      </div>
    </Layer >
  );
};


