import { Ogma as OgmaLib, RawGraph } from "@linkurious/ogma";
import { AnnotationCollection } from "@linkurious/ogma-annotations";
import { EdgeStyle, NodeStyle, Ogma } from "@linkurious/ogma-react";
import React from "react";
import { AnnotationPanelController } from "./components/AnnotationPanelController";
import { Controls } from "./components/Controls";
import { AnnotationsContextProvider } from "../../src";

import "./App.css";

async function loadGraph() {
  const graph = await OgmaLib.parse.jsonFromUrl("./graph.json");
  return graph;
}

async function loadAnnotations(): Promise<AnnotationCollection> {
  const response = await fetch("annotations-test.json");
  return response.json();
}

export default function App() {
  const [graph, setGraph] = React.useState<RawGraph | null>(null);
  const [annotations, setAnnotations] =
    React.useState<AnnotationCollection | null>(null);

  React.useEffect(() => {
    Promise.all([loadGraph(), loadAnnotations()])
      .then(([graphData, annotationsData]) => {
        setGraph(graphData);
        return setAnnotations(annotationsData);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load graph or annotations:", error);
      });
  }, []);

  if (!graph || !annotations) {
    return <div>Loading graph...</div>;
  }

  return (
    <div className="App">
      <Ogma
        graph={graph}
        onReady={(ogma) => {
          //ogma.view.locateGraph({ padding: 50 });

          ogma.tools.brand.set(
            `<div class="brand">
              <a href="../react/">
                <code>ogma-annotations-react</code></a> | <a href="https://github.com/linkurious/ogma-annotations-control/tree/develop/packages/react/web/">code</a>
            </div>`,
            {
              position: "top-left",
              horizontalMargin: 10,
              verticalMargin: 10,
              className: "brand"
            }
          );
        }}
      >
        <NodeStyle attributes={{ color: "#5B97F8" }} />
        <EdgeStyle attributes={{ color: "#C2D7FF" }} />
        <AnnotationsContextProvider annotations={annotations}>
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
              fontSize: 24,
              color: "#3A03CF",
              background: "#EDE6FF",
              borderRadius: 8,
              padding: 12
            }}
          />
          <AnnotationPanelController />
        </AnnotationsContextProvider>
      </Ogma>
    </div>
  );
}
