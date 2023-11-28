import { useState } from 'react';
import { Ogma } from '@linkurious/ogma-react';
import './App.css';
import { RawGraph } from '@linkurious/ogma/umd';

function App() {
  const [graph] = useState<RawGraph>({
    nodes: [
      { id: 0 }
    ],
    edges: []
  });
  return (
    <>
      <h1>Ogma react + annotations</h1>
      <Ogma graph={graph}>

      </Ogma>
    </>
  );
}

export default App;
