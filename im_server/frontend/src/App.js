import React from "react";
import { WebSocketProvider } from "./WebSocketContext";
import "./App.css";
import MainContent from "./components/MainContent";

function App() {
  return (
    <WebSocketProvider>
      <MainContent />
    </WebSocketProvider>
  );
}

export default App;