// import React from "react";
// import { createRoot } from "react-dom/client";

// createRoot(document.getElementById("root")).render(
//   <div style={{ padding: "40px", color: "green" }}>
//     <h1>Resort Reservation System</h1>
//     <p>If you can see this, React is rendering.</p>
//   </div>
// );
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);