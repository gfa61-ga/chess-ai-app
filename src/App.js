



import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";


function App() {
  // Check if there's a saved game in localStorage or start a new one
  const savedFen = localStorage.getItem("gameFen") || "start";
  const initialGame = new Chess();
  if (savedFen !== "start") {
    initialGame.load(savedFen);
  }
  
  const [game, setGame] = useState(initialGame);
  const [fen, setFen] = useState(game.fen());
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  // Initial AI depth set to 5
  const [aiDepth, setAiDepth] = useState(5);
  // New state variables to track latest moves
  const [lastMoveWhite, setLastMoveWhite] = useState("");
  const [lastMoveBlack, setLastMoveBlack] = useState("");
  
  const stockfishRef = useRef(null);

  // Persist game state in localStorage
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
                setLastMoveBlack(move.san);
                // Check for checkmate after AI move
                /*if (game.in_checkmate()) {
                  setStatus("Checkmate! You lose.");
                }*/
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
      setLastMoveWhite(move.san);
      setError("");
      // Check if player's move resulted in checkmate
      /*if (game.in_checkmate()) {
        setStatus("Checkmate! You win.");
        return true;
      }*/
      // Clear any previous status message if game is still active
      setStatus("");
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

  // Function to start a new game
  const handleNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setError("");
    setStatus("");
    setLastMoveWhite("");
    setLastMoveBlack("");
    localStorage.removeItem("gameFen");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}
      {status && (
        <div style={{ color: "green", marginBottom: "10px", fontSize: "18px" }}>
          {status}
        </div>
      )}
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <div><strong>Τελευταία Κίνηση Χάρη:</strong> {lastMoveWhite || "-"}</div>
        <div><strong>Τελευταία Κίνηση ΑΙ:</strong> {lastMoveBlack || "-"}</div>
      </div>
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h1>Χάρης εναντίον ΑΙ</h1>
        <label htmlFor="aiDepth">Βάθος Αναζήτησης ΑΙ: {aiDepth} Βήματο</label>
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
      <Chessboard position={fen} onPieceDrop={onDrop} boardWidth={300} />
      <div>
        <br />
      </div>
      <button onClick={handleNewGame} style={{ marginBottom: "20px", padding: "8px 16px", fontSize: "16px" }}>
        Νέο Παιχνίδι
      </button>
    </div>
  );
}

export default App;
