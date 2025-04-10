import './App.css';
import DataView from './components/DataView.jsx'
function App() {
  return (
    <>
      <h1>NTK Tracker</h1>
      <p>Tato aplikace umožňuje uživatelům sledovat a vizualizovat obsazenost knihovny v průběhu času pomocí grafu..</p>
      <p>
        Projekt je dostupný na {" "}
        <a href="https://github.com/WarriorKnight/NTK-trackerr" target="_blank" rel="noopener noreferrer">
          GitHubu
        </a>
      </p>
      <DataView/>
    </>
  );
}

export default App;