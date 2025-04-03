



import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

function CoordinatesOverlay({ boardWidth }) {
  const squareSize = boardWidth / 8;
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <>
      {/* Files along the bottom */}
      {files.map((file, i) => (
        <div
          key={file}
          style={{
            position: "absolute",
            bottom: -squareSize / 2, // adjust to position below board
            left: i * squareSize,
            width: squareSize,
            textAlign: "center",
            fontSize: squareSize / 2,
            color: "black",
          }}
        >
          {file}
        </div>
      ))}
      {/* Ranks along the left side */}
      {ranks.map((rank, i) => (
        <div
          key={rank}
          style={{
            position: "absolute",
            left: -squareSize / 1.5, // adjust to position left of board
            top: i * squareSize,
            width: squareSize,
            textAlign: "center",
            fontSize: squareSize / 2,
            color: "black",
          }}
        >
          {rank}
        </div>
      ))}
    </>
  );
}


function App() {
  // Check if there's a saved game in localStorage or start a new one
  const savedFen = localStorage.getItem("gameFen") || "start";
  const initialGame = new Chess();
  const boardWidth = 300;
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
      // Determine if the moving piece is a pawn
      const piece = game.get(sourceSquare);
      const promotion = (piece && piece.type === "p" && (targetSquare[1] === "8" || targetSquare[1] === "1"))
        ? "q"
        : undefined;
      
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotion, // This will be undefined if not a pawn promotion
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

  // Undo function: Undoes the last white move and, if available, the corresponding black move.
  const handleUndo = () => {
    // Get current history (verbose mode)
    const history = game.history({ verbose: true });
    if (history.length === 0) return; // Nothing to undo
    // If it's black's turn, that means only white moved.
    if (game.turn() === "b") {
      game.undo();
    } else if (game.turn() === "w") {
      // Black moved last; undo both moves.
      game.undo();
      game.undo();
    }
    setFen(game.fen());
    // Update last moves from new history
    const newHistory = game.history({ verbose: true });
    let newLastMoveWhite = "";
    let newLastMoveBlack = "";
    newHistory.forEach(move => {
      if (move.color === "w") newLastMoveWhite = move.san;
      if (move.color === "b") newLastMoveBlack = move.san;
    });
    setLastMoveWhite(newLastMoveWhite);
    setLastMoveBlack(newLastMoveBlack);
    setStatus("");
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
      <div style={{ marginBottom: "1px", textAlign: "center" }}>
        <h1>Χάρης εναντίον ΑΙ</h1>
      </div>
      <div style={{ marginBottom: "10px", textAlign: "center" }}>
        <label htmlFor="aiDepth">Βάθος Αναζήτησης ΑΙ:  <strong>{aiDepth}</strong>  Βήματα </label>
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

      <div  style={{ marginBottom: "10px", textAlign: "center" }}>
        <div>Τελευταία Κίνηση <strong> Χάρη: <span style={{ color: "#ff0000" }}> {lastMoveWhite || "-" } </span> </strong> </div>
        <div>Τελευταία .. Κίνηση .. <strong> ΑΙ: <span style={{ color: "#ff0000" }}> {lastMoveBlack || "-" } </span> </strong> </div>
      </div>

      <div style={{ position: "relative", width: boardWidth, height: boardWidth }}>
        <Chessboard position={fen} onPieceDrop={onDrop} boardWidth={boardWidth} />
        <CoordinatesOverlay boardWidth={boardWidth} />
      </div>

    
      <div>
        <br />
      </div>
      {/* Buttons */}
      <div style={{ marginBottom: "20px", textAlign: "center", marginTop: "5px"}}>
        <button onClick={handleNewGame} style={{ padding: "8px 16px", fontSize: "16px", marginRight: "10px" }}>
          Νέο Παιχνίδι
        </button>
        <button onClick={handleUndo} style={{ padding: "8px 16px", fontSize: "16px" }}>
          Ακυρωση τελευταίας κίνησης Χάρη
        </button>
      </div>
    </div>
  );
}

export default App;
