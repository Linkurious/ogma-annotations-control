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
import {
  fontSizes, fonts, defaultColors,
  defaultArrowStyle,
  defaultTextStyle,
} from '../src/constants';
const fontOptions = fonts.map(f => ({ value: f, label: f }));
const fontSizeOptions = fontSizes.map(v => ({ value: `${v}`, label: v }));

type ColorPickerProps = {
  color?: string;
  hasTransparent?: boolean;
  setColor?: (c: string) => void;
};
const ColorPicker = ({ color, setColor, hasTransparent }: ColorPickerProps) => {
  const [colors, setColors] = useState(defaultColors);
  useEffect(() => {
    if (hasTransparent) setColors(['none', ...defaultColors.slice(0, -1)]);
    else
      setColors([...defaultColors]);
  }, [hasTransparent]);
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
            backgroundColor: c === 'none' ? '#fff' : c,
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
      const annotation = type === 'arrow'
        ? createArrow(x, y, x, y, { ...defaultArrowStyle })
        : createText(x, y, 0, 0, '...', { ...defaultTextStyle });
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
  };
  return (
    <>
      <Button onClick={() => addAnnotation('arrow')}>
        Add arrow
      </Button>
      <Button onClick={() => addAnnotation('text')}>
        Add text
      </Button>
    </>
  );
};



export const UI = (
  { minThickness, maxThickness }: { minThickness: number, maxThickness: number; }
) => {
  const { currentAnnotation, arrowStyle, setArrowStyle, textStyle, setTextStyle } = useAnnotationsContext();
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
  }
  function setWidth(w: number) {
    const strokeWidth = interpolate(normalize(w, 0, 100), minThickness, maxThickness);
    console.log(strokeWidth);
    setArrowStyle({ ...arrowStyle, strokeWidth });
  }
  function setColor(strokeColor: string) {
    setArrowStyle({ ...arrowStyle, strokeColor });
  }
  function setFont(font: string) {
    setTextStyle({ ...textStyle, font });
  }
  function setSize(f: string) {
    setTextStyle({ ...textStyle, fontSize: `${f}` });
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
      <div className='ui'>
        {
          !currentAnnotation &&
          (<span className='add-buttons'>
            <MenuAdd />
          </span>)
        }
        <div className='tweakpanel' onMouseUp={stopEvent} onMouseDown={stopEvent} onClick={stopEvent}>
          {
            currentAnnotation &&
            isArrow(currentAnnotation) &&
            (
              <span className='rows'>
                <span>Shape</span>
                <ButtonGroup>
                  <Button onClick={() => setExt('none')} icon={<DirectionNone />}></Button>
                  <Button onClick={() => setExt('one')} icon={<DirectionOne />}></Button>
                  <Button onClick={() => setExt('both')} icon={<DirectionBoth />}></Button>
                </ButtonGroup>
                <span>Color</span>
                <ColorPicker color={arrowStyle.strokeColor} setColor={c => setColor(c)} />
                <span>Thickness</span>
                <Slider min={0} max={100} onChange={val => setWidth(val)}
                  initialValue={Math.floor(interpolate(normalize(arrowStyle.strokeWidth || 0, minThickness, maxThickness), 0, 100))} />
              </span>
            )
          }
          {
            currentAnnotation &&
            isText(currentAnnotation) &&
            (
              <span className='rows'>
                <span>Font</span>
                <Select onChange={f => setFont(f as string)}
                  initialValue={textStyle.font}
                >
                  {
                    fontOptions.map(f => <Select.Option key={f.value} value={f.value}>{f.label}</Select.Option>)
                  }
                </Select>
                <span>Size</span>
                <Select onChange={s => setSize(s as string)}
                  initialValue={textStyle.fontSize}
                >
                  {
                    fontSizeOptions.map(s => <Select.Option key={s.value} value={s.value}>{s.label}</Select.Option>)
                  }
                </Select>
                <span>Color</span>
                <ColorPicker color={textStyle.color} setColor={c => setTextColor(c)} />
                <span>Background</span>
                <ColorPicker hasTransparent={true} color={textStyle.background} setColor={c => setBgColor(c)} />
              </span>
            )
          }
        </div>
      </div>
    </Layer >
  );
};


