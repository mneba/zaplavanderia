import { useState, useEffect } from "react";
import { useNavigate, Outlet, NavLink } from "react-router-dom";
import { criarWs } from "../lib/api.js";
import { Logo, Badge } from "../components/ui.jsx";

const NAV = [
  { to: "/", label: "Conversas" },
  { to: "/conexao", label: "Conexao" },
  { to: "/clientes", label: "Clientes", pro: true },
  { to: "/disparo", label: "Disparo", pro: true },
  { to: "/configuracoes", label: "Config" },
];

export default function Layout() {
  const nav = useNavigate();
  const [usuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zap_usuario")); } catch { return null; }
  });
  const [wsEventos, setWsEventos] = useState(null);
  const [alertas, setAlertas] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);

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
  const trialDias = usuario?.plano === "TRIAL" && usuario?.trialExpiraEm
    ? Math.max(0, Math.ceil((new Date(usuario.trialExpiraEm) - Date.now()) / 86400000))
    : null;

  function renderNavItems(onClose) {
    return NAV.map((item) => {
      if (item.pro && !isPro) {
        return (
          <div key={item.to} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 8, color: "rgba(255,255,255,.3)", fontSize: ".9rem", cursor: "not-allowed" }}>
            <span>{item.label}</span>
            <span style={{ marginLeft: "auto", fontSize: ".68rem", background: "var(--pro)", color: "#fff", padding: "1px 6px", borderRadius: 99 }}>Pro</span>
          </div>
        );
      }
      return (
        <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={onClose}
          style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 8,
            color: isActive ? "#fff" : "rgba(255,255,255,.6)",
            background: isActive ? "rgba(255,255,255,.1)" : "transparent",
            fontSize: ".9rem", fontWeight: isActive ? 600 : 400, textDecoration: "none",
          })}>
          <span>{item.label}</span>
          {item.to === "/" && alertas > 0 && (
            <span style={{ marginLeft: "auto", background: "var(--zap)", color: "#fff", fontSize: ".72rem", fontWeight: 700, padding: "1px 7px", borderRadius: 99 }}>
              {alertas > 99 ? "99+" : alertas}
            </span>
          )}
        </NavLink>
      );
    });
  }

  function SidebarInner({ onClose }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Logo />
            {onClose && (
              <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>x</button>
            )}
          </div>
          {usuario && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.5)", marginBottom: 2 }}>Lavanderia</div>
              <div style={{ fontSize: ".88rem", fontWeight: 600, color: "#fff" }}>{usuario.lavanderia}</div>
              <div style={{ marginTop: 6 }}><Badge status={usuario.plano} /></div>
            </div>
          )}
          {trialDias !== null && (
            <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: trialDias <= 2 ? "rgba(224,52,52,.15)" : "rgba(255,197,61,.12)", fontSize: ".78rem", color: trialDias <= 2 ? "#FCA5A5" : "#FDE68A" }}>
              Trial: {trialDias} dia{trialDias !== 1 ? "s" : ""} restante{trialDias !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {renderNavItems(onClose)}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          {usuario && (
            <div style={{ padding: "8px 12px", marginBottom: 4 }}>
              <div style={{ fontSize: ".75rem", color: "rgba(255,255,255,.4)" }}>Logado como</div>
              <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuario.nome}</div>
            </div>
          )}
          <button onClick={sair} style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: ".85rem", borderRadius: 8, cursor: "pointer" }}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Sidebar — desktop only */}
      <aside className="hide-mobile" style={{ width: 220, background: "var(--ink)", color: "#fff", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10 }}>
        <SidebarInner onClose={null} />
      </aside>

      {/* Header — mobile only */}
      <header className="show-mobile" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "var(--ink)", height: 56, alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {alertas > 0 && (
            <span style={{ background: "var(--zap)", color: "#fff", fontSize: ".72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
              {alertas > 99 ? "99+" : alertas}
            </span>
          )}
          <button onClick={() => setMenuAberto(true)} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.4rem", cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            &#9776;
          </button>
        </div>
      </header>

      {/* Drawer mobile */}
      {menuAberto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div onClick={() => setMenuAberto(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} />
          <aside style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 280, background: "var(--ink)", color: "#fff" }}>
            <SidebarInner onClose={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <main className="main-content" style={{ flex: 1, minHeight: "100vh" }}>
        <Outlet context={{ wsEventos, usuario, setAlertas }} />
      </main>
    </div>
  );
}
