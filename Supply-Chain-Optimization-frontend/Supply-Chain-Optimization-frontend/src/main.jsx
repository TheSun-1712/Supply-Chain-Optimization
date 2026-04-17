import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth.jsx";
import { ProductionDataProvider } from "./hooks/useProductionData.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductionDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProductionDataProvider>
    </AuthProvider>
  </React.StrictMode>,
);
