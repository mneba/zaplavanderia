import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";
import { Btn, Spinner, useToast } from "../components/ui.jsx";
import { MoreVertical, RotateCcw } from "lucide-react";

function avatarLetra(nome) {
  return (nome || "?")[0].toUpperCase();
}

function BolhaMensagem({ msg }) {
  const ehCliente = msg.autor === "CLIENTE";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: ehCliente ? "flex-start" : "flex-end", marginBottom: 8 }}>
      <div style={{
        maxWidth: "75%", padding: "10px 14px",
        borderRadius: ehCliente ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: ehCliente ? "#fff" : "var(--turq-light)",
        border: ehCliente ? "1px solid var(--border)" : "1px solid rgba(20,156,179,.2)",
        fontSize: ".9rem", lineHeight: 1.5, wordBreak: "break-word",
      }}>
        {msg.texto}
      </div>
      <div style={{ fontSize: ".72rem", color: "var(--ink-muted)", marginTop: 3 }}>
        {msg.autor === "DONO" ? "Voce" : msg.autor === "BOT" ? "Bot" : "Cliente"} {new Date(msg.criadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}

function DetalheConversa({ conversa, onAtualizar, toast, wsEventos, onVoltar }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [statusLocal, setStatusLocal] = useState(conversa.status);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const fimRef = useRef(null);

  useEffect(() => { setStatusLocal(conversa.status); }, [conversa.id]);

  useEffect(() => {
    setLoading(true);
    api.conversa(conversa.id).then((c) => { setMensagens(c.mensagens); setLoading(false); });
  }, [conversa.id]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  useEffect(() => {
    if (!wsEventos) return;
    if (wsEventos.tipo === "NOVA_MENSAGEM" && wsEventos.conversaId === conversa.id) {
      setMensagens((m) => m.find((msg) => msg.id === wsEventos.mensagem.id) ? m : [...m, wsEventos.mensagem]);
    }
    if (wsEventos.tipo === "CONVERSA_ATUALIZADA" && wsEventos.conversaId === conversa.id) {
      if (wsEventos.status) setStatusLocal(wsEventos.status);
      onAtualizar();
    }
  }, [wsEventos]);

  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const msg = await api.responder(conversa.id, texto);
      setMensagens((m) => [...m, msg]);
      setTexto("");
      onAtualizar();
    } catch (e) { toast.show(e.message, "error"); }
    finally { setEnviando(false); }
  }

  async function assumir() {
    try { await api.assumir(conversa.id); setStatusLocal("HUMANO"); toast.show("Conversa assumida"); onAtualizar(); }
    catch (e) { toast.show(e.message, "error"); }
  }

  async function liberar() {
    try { await api.liberar(conversa.id); setStatusLocal("BOT"); toast.show("Bot reativado"); onAtualizar(); }
    catch (e) { toast.show(e.message, "error"); }
  }

  async function resetar() {
    if (!confirm("Resetar contexto da conversa? O bot vai esquecer o histórico desta conversa na próxima mensagem do cliente.")) return;
    try {
      await api.resetar(conversa.id);
      toast.show("Contexto resetado");
      setMenuAcoesAberto(false);
    } catch (e) { toast.show(e.message, "error"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div className="conversa-header-sticky" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#fff", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {onVoltar && (
          <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--turq-deep)", fontSize: "1.3rem", padding: "0 4px", flexShrink: 0, lineHeight: 1 }}>
            &larr;
          </button>
        )}
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--turq-light)", color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: ".9rem", flexShrink: 0 }}>
          {avatarLetra(conversa.clienteNome)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: ".92rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversa.clienteNome}</div>
          <div style={{ fontSize: ".72rem", color: "var(--ink-muted)" }}>{statusLocal === "BOT" ? "Bot respondendo" : "Voce atendendo"}</div>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuAcoesAberto((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 6, borderRadius: 6, display: "flex", alignItems: "center" }}
            title="Mais ações"
          >
            <MoreVertical size={18} />
          </button>
          {menuAcoesAberto && (
            <>
              <div onClick={() => setMenuAcoesAberto(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 51,
                background: "#fff", border: "1px solid var(--border)", borderRadius: 8,
                boxShadow: "var(--shadow)", minWidth: 200, padding: 4,
              }}>
                <button
                  onClick={resetar}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px",
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8, fontSize: ".88rem",
                    color: "var(--ink)", borderRadius: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <RotateCcw size={14} /> Resetar contexto
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "var(--bg)" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
        ) : mensagens.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--ink-muted)", padding: 40 }}>Nenhuma mensagem ainda</div>
        ) : mensagens.map((msg) => <BolhaMensagem key={msg.id} msg={msg} />)}
        <div ref={fimRef} />
      </div>

      {/* Rodape */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>
            {statusLocal === "BOT" ? "Bot respondendo" : "Voce atendendo"}
          </span>
          {statusLocal === "BOT" ? (
            <Btn variant="ghost" size="sm" onClick={assumir}>Assumir</Btn>
          ) : (
            <Btn variant="success" size="sm" onClick={liberar}>Devolver ao bot</Btn>
          )}
        </div>
        {statusLocal === "BOT" ? (
          <div style={{ textAlign: "center", fontSize: ".83rem", color: "var(--ink-soft)", padding: "6px 0" }}>
            Clique em <strong>Assumir</strong> para responder
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Digite sua resposta..."
              rows={2}
              style={{ flex: 1, border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: ".9rem", resize: "none", outline: "none", fontFamily: "inherit" }}
            />
            <Btn onClick={enviar} disabled={enviando || !texto.trim()} variant="success" style={{ alignSelf: "flex-end" }}>
              {enviando ? "..." : "Enviar"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Conversas() {
  const { wsEventos, setAlertas } = useOutletContext();
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [mobileDetalhe, setMobileDetalhe] = useState(false);
  const toast = useToast();

  async function carregar() {
    try {
      const data = await api.conversas();
      setConversas(data.conversas || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!wsEventos) return;
    // WS reconectou: refresh imediato pra sincronizar estado
    if (wsEventos.tipo === "__WS_CONECTADO__") {
      carregar();
      return;
    }
    if (wsEventos.tipo === "NOVA_MENSAGEM" || wsEventos.tipo === "CONVERSA_ATUALIZADA") {
      carregar();
      setAlertas(0);
    }
  }, [wsEventos]);

  // Sincronizacao defensiva: polling 30s + refresh ao voltar pra aba
  useEffect(() => {
    let intervaloId = null;

    async function recarregar() {
      try {
        const data = await api.conversas();
        setConversas(data.conversas || []);
      } catch {}
    }

    function iniciarPolling() {
      if (intervaloId) return;
      intervaloId = setInterval(() => {
        if (!document.hidden) recarregar();
      }, 30000);
    }

    function pararPolling() {
      if (intervaloId) clearInterval(intervaloId);
      intervaloId = null;
    }

    function onVisibilityChange() {
      if (document.hidden) {
        pararPolling();
      } else {
        recarregar();
        iniciarPolling();
      }
    }

    iniciarPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      pararPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function selecionar(c) {
    const fresh = await api.conversa(c.id);
    setSelecionada({ ...c, status: fresh.status });
    setMobileDetalhe(true);
  }

  const filtradas = conversas.filter((c) =>
    !filtro || c.clienteNome?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="conversas-container" style={{ display: "flex", overflow: "hidden" }}>

      {/* Lista — oculta no mobile quando vendo detalhe */}
      <div style={{
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }} className={`conversas-lista${mobileDetalhe ? " oculto" : ""}`}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.1rem", marginBottom: 12 }}>Conversas</h1>
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar cliente..."
            style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: ".88rem", outline: "none" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
          ) : filtradas.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--ink-muted)", padding: 40 }}>Nenhuma conversa</div>
          ) : filtradas.map((c) => (
            <button key={c.id} onClick={() => selecionar(c)} style={{
              width: "100%", textAlign: "left", padding: "14px 16px",
              border: "none", borderBottom: "1px solid var(--border)",
              background: selecionada?.id === c.id ? "var(--turq-light)" : "#fff",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--turq-light)", color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
                  {avatarLetra(c.clienteNome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.clienteNome}</span>
                    <span style={{ fontSize: ".72rem", color: "var(--ink-muted)", flexShrink: 0, marginLeft: 8 }}>{new Date(c.atualizadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <span style={{ fontSize: ".75rem", padding: "1px 6px", borderRadius: 99, background: c.status === "BOT" ? "var(--zap-light)" : "var(--warning-light)", color: c.status === "BOT" ? "var(--zap)" : "var(--warning)" }}>
                    {c.status === "BOT" ? "Bot" : "Humano"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe — oculto no mobile quando vendo lista */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        className={`conversas-detalhe${!mobileDetalhe && !selecionada ? " oculto" : ""}`}>
        {selecionada ? (
          <DetalheConversa
            key={selecionada.id}
            conversa={selecionada}
            onAtualizar={carregar}
            toast={toast}
            wsEventos={wsEventos}
            onVoltar={() => setMobileDetalhe(false)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-soft)", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: "2rem" }}>💬</div>
            <div>Selecione uma conversa</div>
          </div>
        )}
      </div>

      <toast.ToastContainer />
    </div>
  );
}
