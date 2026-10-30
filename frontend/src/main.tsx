import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./store";
import "./styles.css";

// Hash-routing så att visningsversionen fungerar som en enda fil, oavsett var den ligger.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>,
);
