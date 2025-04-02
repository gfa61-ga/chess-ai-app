

import React, { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";


function App() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("start");
  const [error, setError] = useState("");
  const stockfishRef = useRef(null);

  useEffect(() => {
    try {
      stockfishRef.current = new Worker('stockfish.js');
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
                // Αν για κάποιο λόγο η κίνηση του AI είναι άκυρη
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
      stockfishRef.current.postMessage("go depth 15");
    } catch (aiError) {
      console.error("Σφάλμα κατά την επικοινωνία με το AI:", aiError);
      setError("Παρουσιάστηκε σφάλμα στην επικοινωνία με το AI.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {error}
        </div>
      )}
      <Chessboard position={fen} onPieceDrop={onDrop} boardWidth={500} />
    </div>
  );
}

export default App;
