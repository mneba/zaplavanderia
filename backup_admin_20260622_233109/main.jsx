import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import Login from "./pages/Login.jsx";
import Planos from "./pages/Planos.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import TrialExpirado from "./pages/TrialExpirado.jsx";
import Layout from "./pages/Layout.jsx";
import Conversas from "./pages/Conversas.jsx";
import Conexao from "./pages/Conexao.jsx";
import { Clientes, Disparo } from "./pages/ClientesDisparo.jsx";
import Midias from "./pages/Midias.jsx";
import Configuracoes from "./pages/Configuracoes.jsx";

function Privado({ children }) {
  return localStorage.getItem("zap_token") ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/trial-expirado" element={<TrialExpirado />} />
      <Route path="/" element={<Privado><Layout /></Privado>}>
        <Route index element={<Conversas />} />
        <Route path="conexao" element={<Conexao />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="disparo" element={<Disparo />} />
        <Route path="midias" element={<Midias />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
