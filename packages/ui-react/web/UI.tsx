import '@linkurious/ogma-annotations/style.css';
import { useAnnotationsContext } from "../src/AnnotationsContext";
import { useEffect } from "react";
import { ButtonGroup, Button, Row, Slider } from '@geist-ui/react';
import { DirectionNone } from './icons/direction-none';
import { Layer } from "../src/Layer";
import './UI.css';
import { DirectionBoth } from './icons/direction-both';
import { DirectionOne } from './icons/direction-one';
export const UI = (
) => {
  // const { editor } = useAnnotationsContext();
  // editor.startText(0, 0, createText(0, 0, 0, 0));
  const { editor } = useAnnotationsContext();
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
          <Slider initialValue={0} min={0} max={100} />
        </span>
      </div>
    </Layer>
  );
};


