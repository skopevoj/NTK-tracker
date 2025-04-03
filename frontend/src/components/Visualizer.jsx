import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import axios from 'axios';
import Chart2 from './Chart2';
import ViewSelector from './ViewSelector';
export default function Visualizer() {
    const [data, setData] = useState([]);
    const [view, setView] = useState('day');
    return (
      <div>
        <ViewSelector view={view}/>
        <Chart2 view={view}/>
      </div>
    )
}
