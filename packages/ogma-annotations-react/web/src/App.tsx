import { useState } from "react";
import { Ogma } from "@linkurious/ogma-react";
import "./App.css";
import { RawGraph } from "@linkurious/ogma/umd";
import { AnnotationsContextProvider } from "../../src/AnnotationsContext";
import { Controls } from "./components/Controls";

function App() {
  const [graph] = useState<RawGraph>({
    nodes: [
      { id: 0, attributes: { x: 0, y: 0 } },
      { id: 1, attributes: { x: 50, y: -100 } },
      { id: 2, attributes: { x: -50, y: -100 } }
    ],
    edges: [
      {
        source: 0,
        target: 1
      },
      {
        source: 1,
        target: 2
      },
      {
        source: 2,
        target: 0
      }
    ]
  });
  return (
    <div className="App">
      <Ogma graph={graph}>
        <AnnotationsContextProvider>
          <Controls
            minThickness={1}
            maxThickness={10}
            defaultArrowStyle={{
              strokeType: "plain",
              strokeColor: "#3A03CF",
              strokeWidth: 2,
              head: "arrow"
            }}
            defaultTextStyle={{
              font: "IBM Plex Sans",
              fontSize: 10,
              color: "#3A03CF",
              background: "#EDE6FF",
              borderRadius: 8,
              padding: 12
            }}
          />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}

export default App;
