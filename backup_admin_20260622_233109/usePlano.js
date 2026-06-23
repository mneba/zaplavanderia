import { useState, useEffect } from "react";
import { api } from "./api.js";

// Cache em modulo (uma chamada por sessao do painel)
let _plano = null;
let _promessa = null;

export function usePlano() {
  const [plano, setPlano] = useState(_plano);
  useEffect(() => {
    if (_plano) { setPlano(_plano); return; }
    if (!_promessa) _promessa = api.me().then((d) => { _plano = d.plano || "STARTER"; return _plano; });
    _promessa.then((p) => setPlano(p)).catch(() => setPlano("STARTER"));
  }, []);
  return {
    plano,
    loading: plano === null,
    isPro: plano === "PRO" || plano === "TRIAL",
  };
}
