import { useState } from "react";
import { Ogma } from "@linkurious/ogma-react";
import "./App.css";
import { RawGraph } from "@linkurious/ogma/umd";
import { AnnotationsContextProvider } from "../src/AnnotationsContext";
import { UI } from "./UI";

function App() {
  const [graph] = useState<RawGraph>({
    nodes: [
      { id: 0, attributes: { x: 0, y: 0 } },
      { id: 1, attributes: { x: 100, y: 100 } },
    ],
    edges: [],
  });
  return (
    <div className="App">
      <Ogma graph={graph}>
        <AnnotationsContextProvider>
          <UI minThickness={1} maxThickness={10} />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}

export default App;
