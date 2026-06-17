import { useState, useEffect, useCallback } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { criarWs } from "../lib/api.js";
import { Logo, Badge } from "../components/ui.jsx";

const NAV = [
  { to: "/", icone: "💬", label: "Conversas" },
  { to: "/conexao", icone: "📱", label: "Conexão", sempre: true },
  { to: "/clientes", icone: "👥", label: "Clientes", pro: true },
  { to: "/disparo", icone: "📣", label: "Disparo", pro: true },
  { to: "/configuracoes", icone: "⚙️", label: "Configurações", sempre: true },
];

function BadgeTrial({ usuario }) {
  if (!usuario?.trialExpiraEm) return null;
  const dias = Math.max(0, Math.ceil((new Date(usuario.trialExpiraEm) - Date.now()) / 86400000));
  if (usuario.plano !== "TRIAL") return null;

  return (
    <div style={{
      margin: "8px 8px 0",
      padding: "8px 12px",
      borderRadius: 8,
      background: dias <= 2 ? "rgba(224,52,52,.15)" : "rgba(255,197,61,.12)",
      border: `1px solid ${dias <= 2 ? "rgba(224,52,52,.3)" : "rgba(255,197,61,.3)"}`,
      fontSize: ".78rem",
      color: dias <= 2 ? "#FCA5A5" : "#FDE68A",
    }}>
      ⏱️ Trial: <strong>{dias} dia{dias !== 1 ? "s" : ""}</strong> restante{dias !== 1 ? "s" : ""}
    </div>
  );
}

export default function Layout() {
  const nav = useNavigate();
  const [usuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zap_usuario")); } catch { return null; }
  });
  const [wsEventos, setWsEventos] = useState(null);
  const [alertas, setAlertas] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem("zap_token")) { nav("/login"); return; }
  }, [nav]);

  useEffect(() => {
    const ws = criarWs((evento) => {
      setWsEventos(evento);
      if (evento.tipo === "NOVA_MENSAGEM" || evento.tipo === "CONVERSA_ATUALIZADA") {
        setAlertas((a) => a + 1);
      }
    });
    return () => ws?.close();
  }, []);

  function sair() {
    localStorage.removeItem("zap_token");
    localStorage.removeItem("zap_usuario");
    nav("/login");
  }

  const isPro = usuario?.plano === "PRO";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: 220, background: "var(--ink)", color: "#fff",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <Logo />
          {usuario && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.5)", marginBottom: 2 }}>Lavanderia</div>
              <div style={{ fontSize: ".9rem", fontWeight: 600, color: "#fff" }}>{usuario.lavanderia}</div>
              <div style={{ marginTop: 6 }}>
                <Badge status={usuario.plano} />
              </div>
            </div>
          )}
          <BadgeTrial usuario={usuario} />
        </div>

        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map((item) => {
            if (item.pro && !isPro) {
              return (
                <div key={item.to} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: "var(--radius-sm)",
                  color: "rgba(255,255,255,.3)", fontSize: ".9rem", cursor: "not-allowed",
                }}>
                  <span>{item.icone}</span>
                  <span>{item.label}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: ".68rem", background: "var(--pro)",
                    color: "#fff", padding: "1px 6px", borderRadius: 99,
                  }}>Pro</span>
                </div>
              );
            }
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: "var(--radius-sm)",
                color: isActive ? "#fff" : "rgba(255,255,255,.6)",
                background: isActive ? "rgba(255,255,255,.1)" : "transparent",
                fontSize: ".9rem", fontWeight: isActive ? 600 : 400,
                textDecoration: "none", transition: "all .15s",
              })}>
                <span>{item.icone}</span>
                <span>{item.label}</span>
                {item.to === "/" && alertas > 0 && (
                  <span style={{
                    marginLeft: "auto", background: "var(--zap)", color: "#fff",
                    fontSize: ".72rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                    minWidth: 20, textAlign: "center",
                  }}>{alertas > 99 ? "99+" : alertas}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {usuario && (
            <div style={{ padding: "8px 12px", marginBottom: 4 }}>
              <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)" }}>Logado como</div>
              <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nome}</div>
            </div>
          )}
          <button onClick={sair} style={{
            width: "100%", textAlign: "left", padding: "10px 12px",
            background: "none", border: "none", color: "rgba(255,255,255,.4)",
            fontSize: ".85rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        <Outlet context={{ wsEventos, usuario, setAlertas }} />
      </main>
    </div>
  );
}
