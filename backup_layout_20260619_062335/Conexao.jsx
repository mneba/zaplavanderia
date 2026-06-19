import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";
import { Card, Btn, Spinner } from "../components/ui.jsx";

export default function Conexao() {
  const { wsEventos } = useOutletContext();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregarStatus() {
    try {
      const s = await api.statusConexao();
      setStatus(s);
      if (s.conectado) setQr(null);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarStatus();
    const t = setInterval(carregarStatus, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!wsEventos) return;
    if (wsEventos.tipo === "CONEXAO_ATUALIZADA") carregarStatus();
    if (wsEventos.tipo === "QR_ATUALIZADO" && wsEventos.qr) {
      setQr(wsEventos.qr);
      setLoadingQr(false);
    }
  }, [wsEventos]);

  async function gerarQr() {
    setLoadingQr(true);
    setQr(null);
    try { await api.gerarQr(); } catch { setLoadingQr(false); }
  }

  async function desconectar() {
    if (!confirm("Deseja desconectar?")) return;
    await api.desconectar();
    setQr(null);
    setTimeout(carregarStatus, 2000);
  }

  const conectado = status?.conectado;

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "28px 24px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "1.5rem", marginBottom: 24 }}>
        Conexao WhatsApp
      </h1>

      <Card style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: loading ? "var(--bg)" : conectado ? "var(--zap-light)" : "var(--danger-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>
            {loading ? <Spinner size={24} /> : conectado ? "ok" : "x"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>
              {loading ? "Verificando..." : conectado ? "Conectado" : "Desconectado"}
            </div>
            {conectado && status.numero && (
              <div style={{ fontSize: ".85rem", color: "var(--ink-soft)" }}>{status.numero}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={carregarStatus}>Atualizar</Btn>
            {conectado && <Btn variant="ghost" size="sm" onClick={desconectar}>Desconectar</Btn>}
          </div>
        </div>
      </Card>

      {qr && !conectado && (
        <Card style={{ padding: 24, textAlign: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--display)", fontSize: "1rem", marginBottom: 16 }}>
            Escaneie o QR Code
          </h3>
          <img src={qr} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 12, border: "4px solid var(--border)" }} />
          <p style={{ marginTop: 12, fontSize: ".82rem", color: "var(--ink-muted)" }}>
            QR expira em 60s. Se expirar, gere um novo.
          </p>
        </Card>
      )}

      {!conectado && (
        <Card style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: "1.1rem", marginBottom: 20 }}>
            Como conectar
          </h2>
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <strong>1. Gere o QR Code</strong>
            <p style={{ fontSize: ".88rem", color: "var(--ink-soft)", margin: "6px 0 10px" }}>
              Clique abaixo para gerar o QR Code.
            </p>
            <button
              onClick={gerarQr}
              disabled={loadingQr}
              style={{ background: "var(--zap)", color: "#fff", padding: "10px 20px", borderRadius: 8, fontSize: ".9rem", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              {loadingQr ? "Gerando..." : "Gerar QR Code"}
            </button>
          </div>
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <strong>2. Escaneie com o celular</strong>
            <p style={{ fontSize: ".88rem", color: "var(--ink-soft)", margin: "6px 0" }}>
              WhatsApp no celular, Dispositivos conectados, Conectar dispositivo, escaneie o QR acima.
            </p>
          </div>
          <div>
            <strong>3. Confirme</strong>
            <p style={{ fontSize: ".88rem", color: "var(--ink-soft)", margin: "6px 0" }}>
              Clique em Atualizar para ver o status atualizado.
            </p>
          </div>
        </Card>
      )}

      {msg && (
        <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: ".88rem", background: "var(--zap-light)", color: "var(--zap-deep)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
