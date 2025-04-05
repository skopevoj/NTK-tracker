import './App.css';
import DataView from './components/DataView.jsx'
function App() {
  return (
    <>
    <h1>NTK Tracker</h1>
    <p>This app allows users to track and visualize data over time using interactive charts. Select a date to view specific data points.</p>
      <DataView/>
    </>
  );
}

export default App;