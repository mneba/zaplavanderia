import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { Btn, Spinner, Empty, useToast, Card } from "../components/ui.jsx";

export function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    api.clientes().then(setClientes).finally(() => setLoading(false));
  }, []);

  const filtrados = clientes.filter((c) =>
    !busca ||
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.numero.includes(busca)
  );

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "1.4rem", marginBottom: 4 }}>Clientes</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: ".9rem" }}>
          {clientes.length} clientes na sua base
        </p>
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou número..."
        style={{
          width: "100%", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
          padding: "10px 14px", fontSize: ".9rem", outline: "none", marginBottom: 16,
          background: "#fff",
        }}
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <Empty icone="👥" titulo="Nenhum cliente ainda" descricao="Os clientes aparecem aqui quando interagem com o bot." />
      ) : (
        <Card>
          {filtrados.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
              borderBottom: i < filtrados.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: "var(--turq-light)",
                color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, flexShrink: 0,
              }}>{(c.nome || "?")[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{c.nome}</div>
                <div style={{ fontSize: ".8rem", color: "var(--ink-muted)" }}>+{c.numero}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: ".8rem", color: "var(--ink-soft)" }}>{c.totalMensagens} msgs</div>
                <div style={{ fontSize: ".75rem", color: "var(--ink-muted)" }}>
                  {new Date(c.ultimaInteracao).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function Disparo() {
  const [clientes, setClientes] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.clientes().then(setClientes).finally(() => setLoading(false));
  }, []);

  function toggleCliente(id) {
    setSelecionados((s) => {
      const novo = new Set(s);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  function toggleTodos() {
    if (selecionados.size === clientes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(clientes.map((c) => c.id)));
    }
  }

  async function enviar() {
    if (!mensagem.trim()) return toast.show("Escreva uma mensagem", "error");
    if (selecionados.size === 0) return toast.show("Selecione pelo menos um cliente", "error");
    setEnviando(true);
    try {
      const { total } = await api.disparo(mensagem, [...selecionados]);
      toast.show(`✅ Disparando para ${total} clientes...`);
      setMensagem("");
      setSelecionados(new Set());
    } catch (e) {
      toast.show(e.message, "error");
    } finally {
      setEnviando(false);
    }
  }

  const hora = new Date().getHours();
  const foraHorario = hora < 8 || hora >= 20;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "1.4rem", marginBottom: 4 }}>
          Disparo de mensagens <span style={{ fontSize: ".75rem", background: "var(--pro-light)", color: "var(--pro)", padding: "2px 8px", borderRadius: 99, fontFamily: "var(--body)" }}>Pro ⭐</span>
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: ".9rem" }}>
          Envie cupons, promoções ou avisos para seus clientes. Apenas entre 8h e 20h.
        </p>
      </div>

      {foraHorario && (
        <div style={{
          background: "var(--warning-light)", border: "1px solid var(--warning)",
          borderRadius: "var(--radius-sm)", padding: "12px 16px", marginBottom: 20,
          fontSize: ".88rem", color: "#92400E",
        }}>
          ⚠️ Disparos só são permitidos entre 8h e 20h para proteger seu número de bloqueios.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* Lista de clientes */}
        <Card style={{ overflow: "hidden" }}>
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <input
              type="checkbox"
              checked={selecionados.size === clientes.length && clientes.length > 0}
              onChange={toggleTodos}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span style={{ fontSize: ".88rem", fontWeight: 600 }}>
              {selecionados.size > 0 ? `${selecionados.size} selecionados` : `Selecionar todos (${clientes.length})`}
            </span>
          </div>

          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
            ) : clientes.length === 0 ? (
              <Empty icone="👥" titulo="Nenhum cliente ainda" />
            ) : (
              clientes.map((c) => (
                <label key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                  background: selecionados.has(c.id) ? "var(--turq-light)" : "#fff",
                  transition: "background .1s",
                }}>
                  <input
                    type="checkbox"
                    checked={selecionados.has(c.id)}
                    onChange={() => toggleCliente(c.id)}
                    style={{ width: 16, height: 16, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{c.nome}</div>
                    <div style={{ fontSize: ".78rem", color: "var(--ink-muted)" }}>+{c.numero}</div>
                  </div>
                  <div style={{ fontSize: ".75rem", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                    {new Date(c.ultimaInteracao).toLocaleDateString("pt-BR")}
                  </div>
                </label>
              ))
            )}
          </div>
        </Card>

        {/* Composição da mensagem */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "var(--display)", fontSize: "1rem", marginBottom: 14 }}>
              Mensagem
            </h3>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder={"Oi {nome}! 👋\n\nTemos uma promoção especial pra você esta semana: 20% de desconto em qualquer lavagem com o cupom LAVA20.\n\nVálido até domingo!"}
              rows={8}
              style={{
                width: "100%", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
                padding: "12px 14px", fontSize: ".88rem", resize: "vertical", outline: "none",
                lineHeight: 1.5,
              }}
            />
            <div style={{ fontSize: ".75rem", color: "var(--ink-muted)", marginTop: 8 }}>
              💡 Use {"{nome}"} para personalizar com o nome do cliente
            </div>
          </Card>

          <Card style={{ padding: 20, background: "var(--bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: ".85rem", color: "var(--ink-soft)" }}>Destinatários</span>
              <span style={{ fontWeight: 700 }}>{selecionados.size}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: ".85rem", color: "var(--ink-soft)" }}>Horário estimado</span>
              <span style={{ fontWeight: 700, fontSize: ".85rem" }}>
                ~{Math.ceil(selecionados.size * 13 / 60)} min
              </span>
            </div>
            <Btn
              onClick={enviar}
              disabled={enviando || foraHorario || !mensagem.trim() || selecionados.size === 0}
              style={{ width: "100%", justifyContent: "center", background: "var(--pro)" }}
            >
              {enviando ? "Enviando..." : `📣 Disparar para ${selecionados.size} clientes`}
            </Btn>
          </Card>
        </div>
      </div>

      <toast.ToastContainer />
    </div>
  );
}
