import { useState, useEffect } from "react";
import { api } from "./api.js";

let _data = null;
let _promessa = null;

export function usePlano() {
  const [data, setData] = useState(_data);
  useEffect(() => {
    if (_data) { setData(_data); return; }
    if (!_promessa) _promessa = api.me().then((d) => { _data = d || {}; return _data; });
    _promessa.then((d) => setData(d)).catch(() => setData({}));
  }, []);
  const plano = data?.plano;
  return {
    plano,
    nome: data?.nome,
    email: data?.email,
    loading: data === null,
    isPro: plano === "PRO" || plano === "TRIAL",
    isSuperAdmin: !!data?.superAdmin,
  };
}
