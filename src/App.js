
import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

function App() {
  // Initialize the game: if a saved FEN exists, load it; otherwise start new
  const savedFen = localStorage.getItem("gameFen") || "start";
  const initialGame = new Chess();
  if (savedFen !== "start") {
    // Try to load the saved FEN. If it fails, fallback to the default starting position.
    initialGame.load(savedFen);
  }
  
  const [game, setGame] = useState(initialGame);
  const [fen, setFen] = useState(game.fen());
  const [error, setError] = useState("");
  const [aiDepth, setAiDepth] = useState(15);
  const stockfishRef = useRef(null);

  // Save FEN to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("gameFen", fen);
  }, [fen]);

  useEffect(() => {
    try {
      stockfishRef.current = new Worker(`${process.env.PUBLIC_URL}/stockfish.js`);
      stockfishRef.current.onmessage = (event) => {
        try {
          const line = event.data ? event.data : event;
          if (line.startsWith("bestmove")) {
            const parts = line.split(" ");
            const bestMove = parts[1];
            if (bestMove && bestMove !== "(none)") {
              const from = bestMove.substring(0, 2);
              const to = bestMove.substring(2, 4);
              const move = game.move({ from, to, promotion: "q" });
              if (move) {
                setFen(game.fen());
              } else {
                setError("Η κίνηση του AI ήταν άκυρη.");
              }
            }
          }
        } catch (msgError) {
          console.error("Σφάλμα στην επεξεργασία μηνύματος Stockfish:", msgError);
          setError("Σφάλμα στην επικοινωνία με το Stockfish.");
        }
      };
    } catch (engineError) {
      console.error("Αποτυχία εκκίνησης του Stockfish:", engineError);
      setError("Αποτυχία εκκίνησης του Stockfish.");
    }
    
    return () => {
      if (stockfishRef.current && stockfishRef.current.terminate) {
        stockfishRef.current.terminate();
      }
    };
  }, [game]);

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (move === null) {
        setError("Μη έγκυρη κίνηση. Προσπαθήστε ξανά.");
        return false;
      }
      setFen(game.fen());
      setError("");
      setTimeout(() => {
        makeAIMove();
      }, 500);
      return true;
    } catch (moveError) {
      console.error("Σφάλμα κατά την εκτέλεση της κίνησης:", moveError);
      setError("Παρουσιάστηκε σφάλμα κατά την εκτέλεση της κίνησης.");
      return false;
    }
  };

  const makeAIMove = () => {
    try {
      stockfishRef.current.postMessage("position fen " + game.fen());
      stockfishRef.current.postMessage("go depth " + aiDepth);
    } catch (aiError) {
      console.error("Σφάλμα κατά την επικοινωνία με το AI:", aiError);
      setError("Παρουσιάστηκε σφάλμα στην επικοινωνία με το AI.");
    }
  };

  const handleAiDepthChange = (e) => {
    setAiDepth(e.target.value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <label htmlFor="aiDepth">Βαθμός Δυσκολίας:  {aiDepth}</label>
        <br />
        <input
          id="aiDepth"
          type="range"
          min="5"
          max="20"
          value={aiDepth}
          onChange={handleAiDepthChange}
        />
      </div>
      <Chessboard position={fen} onPieceDrop={onDrop} boardWidth={500} />
    </div>
  );
}

export default App;
