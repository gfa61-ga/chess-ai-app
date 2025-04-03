import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// Register the service worker for offline capability.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${process.env.PUBLIC_URL}/service-worker.js`)
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
  
  });
}
