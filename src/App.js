



import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

// A helper function to update localStorage for both fen and move history
const updateLocalStorage = (game) => {
  localStorage.setItem("gameFen", game.fen());
  localStorage.setItem("gameHistory", JSON.stringify(game.history()));
};


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
  // Create a new game instance
  const newGameInstance = () => new Chess();
  const boardWidth = 300; // Board width in pixels

  // Restore game from localStorage if available
  const savedHistory = JSON.parse(localStorage.getItem("gameHistory"));
  const initialGame = newGameInstance();
  if (savedHistory && Array.isArray(savedHistory)) {
    // Replay moves from history to restore state
    savedHistory.forEach((move) => {
      initialGame.move(move);
    });
  }
  
  const [game, setGame] = useState(initialGame);
  const [fen, setFen] = useState(game.fen());
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  // Initial AI depth set to 1

  const [aiDepth, setAiDepth] = useState(
     localStorage.getItem("aiDepth") ? parseInt(localStorage.getItem("aiDepth"), 10) : 1
  );
  
  const [selectedSquare, setSelectedSquare] = useState(null);

  const [playWithoutStockfish, setPlayWithoutStockfish] = useState(() => {
    const savedState = localStorage.getItem('playWithoutStockfish');
    return savedState === 'true'; // Convert string back to boolean
  });


  // New state variables to track latest moves
  const [lastMoveWhite, setLastMoveWhite] = useState("");
  const [lastMoveBlack, setLastMoveBlack] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const stockfishRef = useRef(null);

  // Persist game state in localStorage
  useEffect(() => {
    localStorage.setItem("gameFen", fen);
  }, [fen]);


  useEffect(() => {
     localStorage.setItem("aiDepth", aiDepth);
  }, [aiDepth]);

  useEffect(() => {
    localStorage.setItem('playWithoutStockfish', playWithoutStockfish.toString());
  }, [playWithoutStockfish]);

  useEffect(() => {
    // When stockfish is enabled and it's black's turn, trigger an AI move
    if (!playWithoutStockfish && game.turn() === "b") {
      setIsAiThinking(true);
      setTimeout(() => {
        makeAIMove();
      }, 500);
    }
  }, [playWithoutStockfish, game]);

  // Update displayed last moves based on game history.
  useEffect(() => {
    const hist = game.history({ verbose: true });
    if (hist.length > 0) {
      const whiteMoves = hist.filter((m) => m.color === "w");
      const blackMoves = hist.filter((m) => m.color === "b");
      setLastMoveWhite(whiteMoves.length > 0 ? whiteMoves[whiteMoves.length - 1].san : "");
      setLastMoveBlack(blackMoves.length > 0 ? blackMoves[blackMoves.length - 1].san : "");
    } else {
      setLastMoveWhite("");
      setLastMoveBlack("");
    }
  }, [fen, game]);


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
                // Stockfish move is black's move.
                setLastMoveBlack(move.san); // Save only after the AI move.
                updateLocalStorage(game);
                if (game.isCheckmate()) {
                  setStatus("Ρουά Ματ! Χάρη έχασες.");
                }
              } else {
                setError("Η κίνηση του AI ήταν άκυρη.");
              }
              // AI move is complete, hide spinner.
              setIsAiThinking(false);
            }
          }
        } catch (msgError) {
          console.error("Σφάλμα στην επεξεργασία μηνύματος Stockfish:", msgError);
          // setError("Σφάλμα στην επικοινωνία με το Stockfish.");
          setIsAiThinking(false);
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
      // When playing without Stockfish, update localStorage immediately.
      if (playWithoutStockfish) {
        updateLocalStorage(game);
      }
      if (game.isCheckmate()) {
        setStatus("Ρουά Ματ! Χάρη κέρδισες.");
        return true;
      }
      // Clear any previous status message if game is still active
      setStatus("");
      // Set spinner visible and let the AI respond after a delay.
      if (!playWithoutStockfish) {
        setIsAiThinking(true);
        setTimeout(() => {
          makeAIMove();
        }, 500);
      }
      return true;
    } catch (moveError) {
      console.error("Σφάλμα κατά την εκτέλεση της κίνησης:", moveError);
      //setError("Παρουσιάστηκε σφάλμα κατά την εκτέλεση της κίνησης.");
      return false;
    }
  };



  // New onSquareClick handler to allow click-to-select then click-to-move.
  const onSquareClick = (square) => {
    // console.log("Square clicked:", square);
    if (selectedSquare) {
      // Get the allowed moves from the currently selected square.
      const allowedMoves = game.moves({ square: selectedSquare, verbose: true });
      // Check if the clicked square is among the allowed moves.
      const moveIsAllowed = allowedMoves.some(m => m.to === square);
      if (!moveIsAllowed) {
        //setError("Move not allowed. Try again.");
        setSelectedSquare(null);
        return;
      }
    
      // Attempt move from selectedSquare to clicked square.
      const piece = game.get(selectedSquare);
      let promotion;
      if (piece && piece.type === "p" && (square[1] === "8" || square[1] === "1")) {
        promotion = "q";
      }
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: promotion,
      });
      if (move === null) {
        setError("Invalid move. Try again.");
        setSelectedSquare(null);
        return;
      }
      setFen(game.fen());
      setLastMoveWhite(move.san);
      setError("");
      updateLocalStorage(game);
      setSelectedSquare(null);
      if (game.isCheckmate()) {
        setStatus("Checkmate! You win.");
        return;
      }
      setStatus("");
      if (!playWithoutStockfish) {
        setIsAiThinking(true);
        setTimeout(() => {
          makeAIMove();
        }, 500);
      }
    } else {
      // If no square selected, select the square if it has a piece and belongs to the player whose turn it is.
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
    }
  };


  const makeAIMove = () => {
    try {
      stockfishRef.current.postMessage("position fen " + game.fen());
      stockfishRef.current.postMessage("go depth " + aiDepth);
    } catch (aiError) {
      console.error("Σφάλμα κατά την επικοινωνία με το AI:", aiError);
      setError("Παρουσιάστηκε σφάλμα στην επικοινωνία με το AI.");
      setIsAiThinking(false);
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
    updateLocalStorage(game);
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
    setIsAiThinking(false);
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
    localStorage.removeItem("gameHistory");
    setIsAiThinking(false);
  };

  // Define custom styles for the selected square
  const customSquareStyles = selectedSquare ? {
    [selectedSquare]: {
      backgroundColor: "rgba(255, 0, 0, 0.5)" // highlight with semi-transparent red
    }
  } : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}

      {!playWithoutStockfish && (
        <div style={{ marginBottom: "1px", textAlign: "center" }}>
          <h2>Χάρης εναντίον Α.Ι.</h2>
        </div>
      )}
      <div style={{ marginBottom: "20px", textAlign: "center", color: "brown" }}>
        <label> <strong>
          <input
            type="checkbox"
            checked={playWithoutStockfish}
            disabled={game.turn() === "b" && !playWithoutStockfish}
            onChange={(e) => setPlayWithoutStockfish(e.target.checked)}
          />
          Παίξε με αντίπαλο άνθρωπο</strong>
        </label>
      </div>

      {/* (Other components) */}
      {playWithoutStockfish && (
        <div style={{ marginBottom: "10px", fontSize: "16px", color: "blue", textAlign: "center", textDecoration: 'underline'  }}>
          {game.turn() === "w" ? "Παίζει ο ΧΑΡΗΣ" : "Παίζουν τα ΜΑΥΡΑ"}
        </div>
      )}

      {/* AI Depth Slider (only shown if Stockfish is on) */}
      {!playWithoutStockfish && (
        <div style={{ marginBottom: "10px", textAlign: "center" }}>
          <label htmlFor="aiDepth">Βάθος Αναζήτησης ΑΙ:  <strong>{aiDepth}</strong>  Βήματα </label>
          <br />
          <input
            id="aiDepth"
            type="range"
            min="1"
            max="30"
            value={aiDepth}
            onChange={handleAiDepthChange}
          />
        </div>
      )}
      
      {status && (
        <div style={{ color: "green", marginBottom: "10px", fontSize: "22px" }}>
          {status}
        </div>
      )}


      <div style={{ textAlign: "center", display: "flex"}}>

      <div  style={{ marginBottom: "10px", textAlign: "center" }}>
        <div>Τελευταία Κίνηση <strong> Χάρη: <span style={{ color: "#ff0000" }}> {lastMoveWhite || "-" } </span> </strong> </div>
        <div>Τελευταία Κίνηση <strong> Μαύρα: <span style={{ color: "#ff0000" }}> {lastMoveBlack || "-" } </span> </strong> </div>
      </div>

      {/* Display AI spinner */}
      {!playWithoutStockfish && isAiThinking && (
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              border: "4px solid rgba(0, 0, 0, 0.1)",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              borderLeftColor: "black",
              animation: "spin 1s linear infinite"
            }}
          ></div>
        </div>
      )}

      </div>
     
      <div style={{ position: "relative", width: boardWidth, height: boardWidth }}>
        <Chessboard position={fen} onPieceDrop={onDrop} customSquareStyles={customSquareStyles} onSquareClick={onSquareClick} boardWidth={boardWidth} />
        <CoordinatesOverlay boardWidth={boardWidth} />
      </div>

    
      <div>
        <br />
      </div>
      {/* Buttons */}
      <div style={{ marginBottom: "20px", textAlign: "center", marginTop: "5px"}}>
        <button onClick={handleUndo} style={{ padding: "16px", fontSize: "16px" }}>
          Ακυρωση τελευταίας κίνησης Χάρη
        </button>
        <button onClick={handleNewGame} style={{ padding: "16px", fontSize: "16px", marginRight: "10px" }}>
          Νέο Παιχνίδι
        </button>
      </div>
    </div>
  );
}

export default App;
