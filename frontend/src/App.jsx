import "./App.css";
import "./index.css";
import DataView from "./components/DataView.jsx";

function App() {
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <h1>NTK Tracker</h1>
          {/* <p className="subtitle">Minimal live library occupancy dashboard</p> */}
        </div>
        <nav className="nav">
          <a
            className="link"
            href="https://github.com/WarriorKnight/NTK-trackerr"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source on GitHub
          </a>
        </nav>
      </header>

      <main>
        <DataView />
      </main>

      <footer className="footer">Built for learning — live demo available online</footer>
    </div>
  );
}

export default App;
