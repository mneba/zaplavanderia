import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { Btn, Spinner, Empty, useToast, Card } from "../components/ui.jsx";
import { Trash2, Plus, Image as ImageIcon, Video, X } from "lucide-react";

export default function Midias() {
  const [midias, setMidias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const toast = useToast();

  async function carregar() {
    try {
      const data = await api.listarMidias();
      setMidias(data.midias || []);
    } catch (e) {
      toast.show(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function toggleAtiva(midia) {
    try {
      await api.atualizarMidia(midia.id, { ativa: !midia.ativa });
      setMidias((ms) => ms.map((m) => m.id === midia.id ? { ...m, ativa: !m.ativa } : m));
    } catch (e) {
      toast.show(e.message, "error");
    }
  }

  async function deletar(midia) {
    if (!confirm(`Apagar a midia "${midia.nome}"?`)) return;
    try {
      await api.deletarMidia(midia.id);
      setMidias((ms) => ms.filter((m) => m.id !== midia.id));
      toast.show("Midia apagada");
    } catch (e) {
      toast.show(e.message, "error");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.4rem", marginBottom: 4 }}>
            Midias do bot <span style={{ fontSize: ".75rem", background: "var(--pro-light)", color: "var(--pro)", padding: "2px 8px", borderRadius: 99, fontFamily: "var(--body)" }}>Pro ⭐</span>
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: ".9rem" }}>
            Cadastre imagens ou videos que o bot envia automaticamente quando relevante.
          </p>
        </div>
        <Btn onClick={() => setModalAberto(true)} style={{ background: "var(--pro)", flexShrink: 0 }}>
          <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Nova midia
        </Btn>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>
      ) : midias.length === 0 ? (
        <Empty
          icone="🎬"
          titulo="Nenhuma midia cadastrada"
          descricao="Adicione imagens ou videos para o bot enviar automaticamente."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {midias.map((m) => (
            <Card key={m.id} style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, background: "var(--turq-light)",
                  color: "var(--turq-deep)", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {m.tipo === "imagem" ? <ImageIcon size={22} /> : <Video size={22} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: ".95rem" }}>{m.nome}</span>
                    <span style={{
                      fontSize: ".68rem", fontWeight: 700, padding: "1px 8px", borderRadius: 99,
                      background: m.ativa ? "var(--zap-light)" : "var(--bg)",
                      color: m.ativa ? "var(--zap-deep)" : "var(--ink-muted)",
                    }}>
                      {m.ativa ? "ATIVA" : "PAUSADA"}
                    </span>
                  </div>
                  <div style={{ fontSize: ".82rem", color: "var(--ink-soft)", marginBottom: 4 }}>
                    <strong>Enviar quando:</strong> {m.quandoEnviar}
                  </div>
                  {m.legenda && (
                    <div style={{ fontSize: ".8rem", color: "var(--ink-muted)", fontStyle: "italic" }}>
                      Legenda: "{m.legenda}"
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleAtiva(m)} style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: 6,
                    padding: "6px 10px", fontSize: ".78rem", cursor: "pointer", color: "var(--ink-soft)",
                  }}>
                    {m.ativa ? "Pausar" : "Ativar"}
                  </button>
                  <button onClick={() => deletar(m)} style={{
                    background: "none", border: "1px solid var(--danger-light)", borderRadius: 6,
                    padding: "6px 10px", cursor: "pointer", color: "var(--danger)",
                    display: "flex", alignItems: "center",
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalAberto && (
        <ModalNovaMidia
          onClose={() => setModalAberto(false)}
          onCriada={(m) => { setMidias((ms) => [m, ...ms]); toast.show("Midia criada"); setModalAberto(false); }}
          toast={toast}
        />
      )}
      <toast.ToastContainer />
    </div>
  );
}

function ModalNovaMidia({ onClose, onCriada, toast }) {
  const [nome, setNome] = useState("");
  const [quandoEnviar, setQuandoEnviar] = useState("");
  const [legenda, setLegenda] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    if (!nome.trim()) return toast.show("Nome obrigatorio", "error");
    if (!quandoEnviar.trim()) return toast.show("Descricao 'quando enviar' obrigatoria", "error");
    if (!arquivo) return toast.show("Selecione um arquivo", "error");
    if (arquivo.size > 10 * 1024 * 1024) return toast.show("Arquivo muito grande (max 10MB)", "error");

    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("nome", nome.trim());
      fd.append("quandoEnviar", quandoEnviar.trim());
      if (legenda.trim()) fd.append("legenda", legenda.trim());
      fd.append("arquivo", arquivo);
      const m = await api.criarMidia(fd);
      onCriada(m);
    } catch (e) {
      toast.show(e.message, "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "100%",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: "1.1rem" }}>Nova midia</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 6 }}>Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Como usar maquina"
              style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: ".9rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 6 }}>
              Quando enviar?
            </label>
            <textarea
              value={quandoEnviar}
              onChange={(e) => setQuandoEnviar(e.target.value)}
              placeholder="Descreva o tipo de pergunta. Ex: cliente perguntar como lavar, como usar maquina, ou pedir instrucoes"
              rows={3}
              style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: ".88rem", outline: "none", resize: "vertical", fontFamily: "inherit" }}
            />
            <p style={{ fontSize: ".72rem", color: "var(--ink-muted)", marginTop: 4 }}>
              A IA usa essa descricao pra decidir quando enviar a midia.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 6 }}>
              Legenda (opcional)
            </label>
            <input
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Texto que vai junto da imagem/video"
              style={{ width: "100%", border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: ".9rem", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 6 }}>
              Arquivo (imagem ou video, max 10MB)
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setArquivo(e.target.files[0])}
              style={{ width: "100%", fontSize: ".88rem" }}
            />
            {arquivo && (
              <p style={{ fontSize: ".75rem", color: "var(--ink-muted)", marginTop: 4 }}>
                {arquivo.name} — {(arquivo.size / 1024 / 1024).toFixed(2)}MB
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 22, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={enviar} disabled={enviando} style={{ background: "var(--pro)" }}>
            {enviando ? "Enviando..." : "Criar"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
