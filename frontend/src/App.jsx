import "./App.css";
import "./index.css";
import DataView from "./components/DataView.jsx";

function App() {
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <h1>NTK Tracker</h1>
          <p className="subtitle">Real-time library occupancy dashboard</p>
        </div>
      </header>

      <main>
        <DataView />
      </main>

      <footer className="footer">Built for learning — Tracking NTK library occupancy in real-time</footer>
    </div>
  );
}

export default App;
