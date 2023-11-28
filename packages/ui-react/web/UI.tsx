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
import { AnnotationFeature, AnnotationProps } from '@linkurious/ogma-annotations';
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
const ColorPicker = () => {
  const [color, setColor] = useState('#AEA1FF');
  const [colors] = useState(defaultColors);
  return (
    <span className='colorpicker'>
      {colors.map(c => <div
        key={c}
        className={c === color ? 'selected' : ''}
        style={{
          width: 12,
          height: 12,
          borderRadius: 10,
          backgroundColor: c,
          margin: 5,
          cursor: 'pointer',
        }}
        onClick={() => setColor(c)}
      />
      )}
    </span>
  );

};


export const UI = (
) => {
  // const { editor } = useAnnotationsContext();
  // editor.startText(0, 0, createText(0, 0, 0, 0));
  const { editor } = useAnnotationsContext();
  const current = useState(null);
  useEffect(() => {
    if (!editor) return;
    const x = 0;
    const y = 0;

    // const text = createText(x, y, 0, 0);
    // editor.startText(x, y, text);
  }, [editor]);
  return (
    <Layer>
      <div className='ui'>
        <span className='rows'>
          <ButtonGroup>
            <Button icon={<DirectionNone />}></Button>
            <Button icon={<DirectionOne />}></Button>
            <Button icon={<DirectionBoth />}></Button>
          </ButtonGroup>
          <ColorPicker />
          <Slider min={0} max={100} onChange={val => console.log(val)} />
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
          <ColorPicker />
          <ColorPicker />
        </span>
      </div>
    </Layer>
  );
};


