import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api.js";
import { Badge, Btn, Spinner, Empty, useToast, tempoRelativo } from "../components/ui.jsx";

function avatarLetra(nome) {
  return (nome || "?")[0].toUpperCase();
}

function BolhaMensagem({ msg }) {
  const isCliente = msg.autor === "CLIENTE";
  const isBot = msg.autor === "BOT";
  const cores = {
    CLIENTE: { bg: "#fff", borda: "1px solid var(--border)", align: "flex-start" },
    BOT: { bg: "var(--turq-light)", borda: "none", align: "flex-end" },
    DONO: { bg: "#DCF8C6", borda: "none", align: "flex-end" },
  }[msg.autor] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: cores.align, marginBottom: 8 }}>
      {isCliente && (
        <span style={{ fontSize: ".72rem", color: "var(--ink-muted)", marginBottom: 3 }}>Cliente</span>
      )}
      {isBot && (
        <span style={{ fontSize: ".72rem", color: "var(--turq)", marginBottom: 3 }}>🤖 Bot</span>
      )}
      <div style={{
        maxWidth: "75%", background: cores.bg, border: cores.borda,
        borderRadius: 12, padding: "10px 14px", fontSize: ".92rem", lineHeight: 1.45,
        boxShadow: "0 1px 2px rgba(0,0,0,.06)",
      }}>
        <p style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.texto}</p>
        <span style={{ display: "block", textAlign: "right", fontSize: ".68rem", color: "var(--ink-muted)", marginTop: 4 }}>
          {new Date(msg.criadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function DetalheConversa({ conversa, onAtualizar, toast }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [statusLocal, setStatusLocal] = useState(conversa.status);

  // Sincroniza só quando muda de conversa
  useEffect(() => {
    setStatusLocal(conversa.status);
  }, [conversa.id]);
  const fimRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    api.conversa(conversa.id).then((c) => {
      setMensagens(c.mensagens);
      setLoading(false);
    });
  }, [conversa.id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  async function enviar() {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      const msg = await api.responder(conversa.id, texto);
      setMensagens((m) => [...m, msg]);
      setTexto("");
      onAtualizar();
    } catch (e) {
      toast.show(e.message, "error");
    } finally {
      setEnviando(false);
    }
  }

  async function assumir() {
    try {
      await api.assumir(conversa.id);
      toast.show("Conversa assumida — bot em silêncio");
      setStatusLocal("HUMANO");
      onAtualizar();
    } catch (e) {
      toast.show(e.message, "error");
    }
  }

  async function liberar() {
    try {
      await api.liberar(conversa.id);
      toast.show("Bot reativado para essa conversa");
      setStatusLocal("BOT");
      onAtualizar();
    } catch (e) {
      toast.show(e.message, "error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--border)",
        background: "#fff", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%", background: "var(--turq-light)",
          color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: "1.1rem", flexShrink: 0,
        }}>{avatarLetra(conversa.clienteNome)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{conversa.clienteNome}</div>
          <div style={{ fontSize: ".8rem", color: "var(--ink-muted)" }}>
            +{conversa.clienteJid?.replace("@s.whatsapp.net", "")}
          </div>
        </div>
        <Badge status={statusLocal} />
        {statusLocal === "BOT" ? (
          <Btn variant="ghost" size="sm" onClick={assumir}>Assumir</Btn>
        ) : (
          <Btn variant="success" size="sm" onClick={liberar}>Devolver ao bot</Btn>
        )}
      </div>

      {/* Mensagens */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "20px",
        background: "var(--bg)",
        backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
        ) : mensagens.length === 0 ? (
          <Empty icone="💬" titulo="Nenhuma mensagem ainda" />
        ) : (
          mensagens.map((m) => <BolhaMensagem key={m.id} msg={m} />)
        )}
        <div ref={fimRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px", background: "#fff", borderTop: "1px solid var(--border)",
        display: "flex", gap: 10, alignItems: "flex-end",
      }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder={statusLocal === "BOT" ? "Assuma a conversa para responder..." : "Digite sua resposta (Enter para enviar)..."}
          disabled={statusLocal === "BOT"}
          rows={1}
          style={{
            flex: 1, resize: "none", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
            padding: "10px 14px", fontSize: ".92rem", outline: "none",
            opacity: statusLocal === "BOT" ? .5 : 1,
            maxHeight: 120, overflowY: "auto",
          }}
        />
        <Btn onClick={enviar} disabled={enviando || !texto.trim() || statusLocal === "BOT"} variant="success">
          {enviando ? "..." : "Enviar"}
        </Btn>
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
  const toast = useToast();

  async function carregar() {
    try {
      const { conversas: lista } = await api.conversas({ pagina: 1 });
      setConversas(lista);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (!wsEventos) return;
    if (wsEventos.tipo === "NOVA_MENSAGEM" || wsEventos.tipo === "CONVERSA_ATUALIZADA") {
      carregar();
      setAlertas(0);
    }
  }, [wsEventos]);

  async function selecionar(c) {
    setSelecionada(c);
    setAlertas(0);
    // Atualiza status da conversa selecionada após ações
    const fresh = await api.conversa(c.id);
    setSelecionada({ ...c, status: fresh.status });
  }

  const filtradas = conversas.filter((c) =>
    !filtro || c.clienteNome.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Lista */}
      <div style={{
        width: 320, borderRight: "1px solid var(--border)", background: "#fff",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.1rem", marginBottom: 12 }}>Conversas</h1>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar cliente..."
            style={{
              width: "100%", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
              padding: "8px 12px", fontSize: ".88rem", outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
          ) : filtradas.length === 0 ? (
            <Empty icone="💬" titulo="Nenhuma conversa" descricao="Quando um cliente mandar mensagem, aparece aqui." />
          ) : (
            filtradas.map((c) => (
              <button
                key={c.id}
                onClick={() => selecionar(c)}
                style={{
                  width: "100%", textAlign: "left", padding: "14px 16px",
                  borderBottom: "1px solid var(--border)", background: selecionada?.id === c.id ? "var(--turq-light)" : "#fff",
                  border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  transition: "background .1s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", background: "var(--turq-light)",
                    color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: ".95rem", flexShrink: 0,
                  }}>{avatarLetra(c.clienteNome)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: ".9rem" }}>{c.clienteNome}</span>
                      <span style={{ fontSize: ".72rem", color: "var(--ink-muted)" }}>{tempoRelativo(c.atualizadaEm)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <Badge status={c.status} />
                      {c.ultimaMensagem && (
                        <span style={{
                          fontSize: ".78rem", color: "var(--ink-soft)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140,
                        }}>{c.ultimaMensagem.texto}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div style={{ flex: 1 }}>
        {selecionada ? (
          <DetalheConversa
            key={selecionada.id}
            conversa={selecionada}
            onAtualizar={carregar}
            toast={toast}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--ink-soft)" }}>
            <Empty icone="👈" titulo="Selecione uma conversa" descricao="Escolha uma conversa na lista ao lado para ver o histórico e responder." />
          </div>
        )}
      </div>

      <toast.ToastContainer />
    </div>
  );
}
