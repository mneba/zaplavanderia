import { useState, useEffect } from "react";
import { api } from "../lib/api.js";
import { Btn, Spinner, useToast, Card } from "../components/ui.jsx";

// ── Constantes ────────────────────────────────────────────────
const FRANQUIAS = [
  { id: "independente", label: "Independente" },
  { id: "lavateria", label: "Lavateria" },
  { id: "60minutos", label: "60 Minutos" },
  { id: "lavo", label: "Lavô" },
];

const PAGAMENTOS = [
  "Pix (QR Code na máquina)",
  "Cartão de crédito por aproximação",
  "Cartão de débito por aproximação",
  "App da rede",
  "Dinheiro",
];

const TONS = [
  { id: "simpatico", label: "😊 Simpático", desc: "Caloroso, próximo, usa emojis com moderação" },
  { id: "formal", label: "🤝 Formal", desc: "Educado, profissional, sem gírias" },
  { id: "descontraido", label: "😄 Descontraído", desc: "Leve, bem-humorado, como um amigo" },
];

const ESCALACOES_PADRAO = [
  { id: "irritacao", label: "Cliente demonstrar irritação ou reclamação" },
  { id: "pagamento", label: "Problema no pagamento (cobrança não reconhecida, pagamento não aprovado)" },
  { id: "imagem", label: "Cliente mandar imagem ou vídeo" },
  { id: "esqueceu", label: "Cliente mencionar que esqueceu algo na lavanderia" },
  { id: "escopo", label: "Assunto completamente fora do escopo da lavanderia" },
  { id: "humano", label: "Cliente pedir explicitamente para falar com humano" },
  { id: "multiplas", label: "Cliente mandar mais de 5 mensagens sem problema resolvido" },
];

// ── Config inicial vazia ──────────────────────────────────────
const CONFIG_VAZIA = {
  franquia: "independente",
  endereco: "",
  horario: "",
  wifi: "",
  telefoneSuporte: "",
  diferenciais: "",
  maquinas: [
    { id: 1, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 },
    { id: 2, tipo: "secadora", capacidadeKg: 10, precoReais: 0 },
  ],
  duracaoCicloMinutos: { lavagem: 35, secagem: 45 },
  formasPagamento: ["Pix (QR Code na máquina)", "Cartão de crédito por aproximação"],
  observacoesPagamento: "",
  faq: [
    { pergunta: "Preciso levar sabão?", resposta: "" },
    { pergunta: "Como funciona o pagamento?", resposta: "" },
  ],
  politicaReembolso: "Reembolsos são processados via Pix em até 24h úteis após confirmação da falha. É necessário informar: número da máquina, horário do pagamento e chave Pix.",
  tom: "simpatico",
  numeroTipo: "chip", // "chip" ou "pessoal"
  escalacoes: ["irritacao", "pagamento", "imagem", "escopo", "humano"],
  escalacaoCustom: "",
};

// ── Sub-componentes ───────────────────────────────────────────
function Secao({ titulo, desc, children }) {
  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
        <h2 style={{ fontFamily: "var(--display)", fontSize: "1.05rem", marginBottom: 2 }}>{titulo}</h2>
        {desc && <p style={{ fontSize: ".85rem", color: "var(--ink-soft)" }}>{desc}</p>}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </Card>
  );
}

function Campo({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: ".78rem", color: "var(--ink-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", style }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", border: "1.5px solid var(--border)", borderRadius: 8,
        padding: "10px 14px", fontSize: ".92rem", outline: "none",
        ...style,
      }}
      onFocus={(e) => e.target.style.borderColor = "var(--turq)"}
      onBlur={(e) => e.target.style.borderColor = "var(--border)"}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", border: "1.5px solid var(--border)", borderRadius: 8,
        padding: "10px 14px", fontSize: ".92rem", outline: "none", resize: "vertical",
      }}
      onFocus={(e) => e.target.style.borderColor = "var(--turq)"}
      onBlur={(e) => e.target.style.borderColor = "var(--border)"}
    />
  );
}

// ── Página principal ──────────────────────────────────────────
export default function Configuracoes() {
  const [nome, setNome] = useState("");
  const [config, setConfig] = useState(CONFIG_VAZIA);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState("");
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.obterConfig().then(({ nome: n, config: c }) => {
      setNome(n || "");
      if (c && Object.keys(c).length > 0) {
        setConfig({ ...CONFIG_VAZIA, ...c });
      }
    }).finally(() => setLoading(false));
  }, []);

  function set(campo, valor) {
    setConfig((c) => ({ ...c, [campo]: valor }));
  }

  async function carregarTemplate(franquia) {
    if (franquia === "independente") {
      set("franquia", "independente");
      return;
    }
    try {
      const t = await api.obterTemplate(franquia);
      setConfig((c) => ({ ...c, ...t, franquia }));
      toast.show(`Template ${t.franquia} carregado — ajuste os preços!`);
    } catch {
      toast.show("Erro ao carregar template", "error");
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      await api.salvarConfig({ nome, ...config });
      toast.show("✅ Configuração salva com sucesso!");
    } catch (e) {
      toast.show(e.message, "error");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarPreview() {
    setLoadingPreview(true);
    setMostrarPreview(true);
    try {
      const { preview: p } = await api.previewConfig({ nome, ...config });
      setPreview(p);
    } catch {
      setPreview("Erro ao gerar preview.");
    } finally {
      setLoadingPreview(false);
    }
  }

  // ── Máquinas ─────────────────────────────────────────────
  function addMaquina() {
    const id = Math.max(0, ...config.maquinas.map((m) => m.id)) + 1;
    set("maquinas", [...config.maquinas, { id, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 }]);
  }

  function removerMaquina(id) {
    set("maquinas", config.maquinas.filter((m) => m.id !== id));
  }

  function editarMaquina(id, campo, valor) {
    set("maquinas", config.maquinas.map((m) =>
      m.id === id ? { ...m, [campo]: campo === "precoReais" || campo === "capacidadeKg" ? Number(valor) : valor } : m
    ));
  }

  // ── FAQ ──────────────────────────────────────────────────
  function addFaq() {
    set("faq", [...config.faq, { pergunta: "", resposta: "" }]);
  }

  function removerFaq(i) {
    set("faq", config.faq.filter((_, idx) => idx !== i));
  }

  function editarFaq(i, campo, valor) {
    set("faq", config.faq.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f));
  }

  // ── Pagamentos ───────────────────────────────────────────
  function togglePagamento(p) {
    const lista = config.formasPagamento.includes(p)
      ? config.formasPagamento.filter((x) => x !== p)
      : [...config.formasPagamento, p];
    set("formasPagamento", lista);
  }

  // ── Escalações ───────────────────────────────────────────
  function toggleEscalacao(id) {
    const lista = config.escalacoes.includes(id)
      ? config.escalacoes.filter((x) => x !== id)
      : [...config.escalacoes, id];
    set("escalacoes", lista);
  }

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <Spinner size={36} />
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 110px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "1.5rem", marginBottom: 4 }}>
          Configurações da lavanderia
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: ".9rem" }}>
          Essas informações ensinam o bot a atender seus clientes.
        </p>
      </div>

      {/* 1. Identidade */}
      <Secao titulo="1. Identidade" desc="Informações básicas que o bot usa para se apresentar e responder dúvidas.">
        <Campo label="Nome da lavanderia *">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lavanderia do Centro" />
        </Campo>

        <Campo label="Rede / Franquia">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FRANQUIAS.map((f) => (
              <button
                key={f.id}
                onClick={() => carregarTemplate(f.id)}
                style={{
                  padding: "8px 16px", borderRadius: 99, fontSize: ".85rem", fontWeight: 600,
                  border: `2px solid ${config.franquia === f.id ? "var(--turq)" : "var(--border)"}`,
                  background: config.franquia === f.id ? "var(--turq-light)" : "#fff",
                  color: config.franquia === f.id ? "var(--turq-deep)" : "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >{f.label}</button>
            ))}
          </div>
          {config.franquia !== "independente" && (
            <p style={{ fontSize: ".78rem", color: "var(--turq-deep)", marginTop: 8 }}>
              ✅ Template {config.franquia} carregado — revise e ajuste os preços
            </p>
          )}
        </Campo>

        <Campo label="Endereço completo">
          <Input value={config.endereco} onChange={(e) => set("endereco", e.target.value)}
            placeholder="Rua das Flores, 123 — Centro, São Paulo/SP" />
        </Campo>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Campo label="Horário de funcionamento">
            <Input value={config.horario} onChange={(e) => set("horario", e.target.value)}
              placeholder="Aberta 24 horas, todos os dias" />
          </Campo>
          <Campo label="Telefone de suporte (opcional)">
            <Input value={config.telefoneSuporte} onChange={(e) => set("telefoneSuporte", e.target.value)}
              placeholder="(11) 99999-9999" />
          </Campo>
        </div>

        <Campo label="Wi-Fi para clientes (opcional)">
          <Input value={config.wifi} onChange={(e) => set("wifi", e.target.value)}
            placeholder="Rede: MinhaLav | Senha: lavar123" />
        </Campo>

        <Campo label="Diferenciais da sua unidade (opcional)"
          hint="O bot menciona isso quando o cliente perguntar sobre a lavanderia.">
          <Textarea value={config.diferenciais} onChange={(e) => set("diferenciais", e.target.value)}
            placeholder="Ex: Estacionamento gratuito, ar-condicionado, cadeiras confortáveis, TV na sala de espera..." />
        </Campo>
      </Secao>

      {/* 2. Máquinas */}
      <Secao titulo="2. Máquinas e preços" desc="Liste todas as máquinas disponíveis. O bot usa isso para responder preços e dúvidas.">
        {config.maquinas.map((m) => (
          <div key={m.id} style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: 10, marginBottom: 10, alignItems: "center",
          }}>
            <select
              value={m.tipo}
              onChange={(e) => editarMaquina(m.id, "tipo", e.target.value)}
              style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: ".9rem" }}
            >
              <option value="lavadora">🫧 Lavadora</option>
              <option value="secadora">🌀 Secadora</option>
            </select>
            <Input
              type="number" value={m.capacidadeKg}
              onChange={(e) => editarMaquina(m.id, "capacidadeKg", e.target.value)}
              placeholder="Kg"
              style={{ textAlign: "center" }}
            />
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)", fontSize: ".9rem" }}>R$</span>
              <Input
                type="number" value={m.precoReais}
                onChange={(e) => editarMaquina(m.id, "precoReais", e.target.value)}
                placeholder="0,00"
                style={{ paddingLeft: 32, textAlign: "right" }}
              />
            </div>
            <button onClick={() => removerMaquina(m.id)} style={{
              width: 36, height: 36, borderRadius: 8, border: "none",
              background: "var(--danger-light)", color: "var(--danger)",
              cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, marginBottom: 20,
          fontSize: ".78rem", color: "var(--ink-muted)" }}>
          <span>Coluna:</span>
          <span style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>Tipo</span>
          <span style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>Capacidade (kg)</span>
          <span style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4 }}>Preço (R$)</span>
        </div>

        <Btn variant="ghost" size="sm" onClick={addMaquina}>+ Adicionar máquina</Btn>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <Campo label="Duração da lavagem (minutos)">
            <Input type="number" value={config.duracaoCicloMinutos.lavagem}
              onChange={(e) => set("duracaoCicloMinutos", { ...config.duracaoCicloMinutos, lavagem: Number(e.target.value) })}
              placeholder="35" />
          </Campo>
          <Campo label="Duração da secagem (minutos)">
            <Input type="number" value={config.duracaoCicloMinutos.secagem}
              onChange={(e) => set("duracaoCicloMinutos", { ...config.duracaoCicloMinutos, secagem: Number(e.target.value) })}
              placeholder="45" />
          </Campo>
        </div>
      </Secao>

      {/* 3. Pagamento */}
      <Secao titulo="3. Formas de pagamento" desc="Marque as formas aceitas na sua unidade.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {PAGAMENTOS.map((p) => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.formasPagamento.includes(p)}
                onChange={() => togglePagamento(p)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: ".92rem" }}>{p}</span>
            </label>
          ))}
        </div>
        <Campo label="Observações de pagamento (opcional)"
          hint="Ex: Pix só para pagamentos acima de R$ 10. Cartão aceito apenas por aproximação.">
          <Textarea value={config.observacoesPagamento}
            onChange={(e) => set("observacoesPagamento", e.target.value)}
            placeholder="Informe detalhes específicos sobre pagamento na sua unidade..." />
        </Campo>
      </Secao>

      {/* 4. FAQ */}
      <Secao titulo="4. Perguntas frequentes" desc="O bot usa essas respostas quando o cliente perguntar algo específico.">
        {config.faq.map((f, i) => (
          <div key={i} style={{
            border: "1.5px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Input value={f.pergunta} onChange={(e) => editarFaq(i, "pergunta", e.target.value)}
                  placeholder="Ex: Precisa levar sabão?" style={{ marginBottom: 8 }} />
                <Textarea value={f.resposta} onChange={(e) => editarFaq(i, "resposta", e.target.value)}
                  placeholder="Ex: Não! Sabão e amaciante já estão inclusos no preço." rows={2} />
              </div>
              <button onClick={() => removerFaq(i)} style={{
                width: 32, height: 32, borderRadius: 6, border: "none", flexShrink: 0,
                background: "var(--danger-light)", color: "var(--danger)", cursor: "pointer", fontSize: "1rem",
              }}>×</button>
            </div>
          </div>
        ))}
        <Btn variant="ghost" size="sm" onClick={addFaq}>+ Adicionar pergunta</Btn>
      </Secao>

      {/* 5. Políticas e tom */}
      <Secao titulo="5. Política e tom do bot" desc="Como o bot se comporta e o que ele pode prometer.">
        <Campo label="Política de reembolso"
          hint="O bot usa esse texto quando o cliente reclamar de cobrança indevida ou máquina que não funcionou.">
          <Textarea value={config.politicaReembolso}
            onChange={(e) => set("politicaReembolso", e.target.value)} rows={4} />
        </Campo>

        <Campo label="Tom de voz do bot">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {TONS.map((t) => (
              <button key={t.id} onClick={() => set("tom", t.id)} style={{
                flex: "1 1 160px", padding: "14px 16px", borderRadius: 10, textAlign: "left",
                border: `2px solid ${config.tom === t.id ? "var(--turq)" : "var(--border)"}`,
                background: config.tom === t.id ? "var(--turq-light)" : "#fff",
                cursor: "pointer",
              }}>
                <div style={{ fontWeight: 700, fontSize: ".9rem", marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </Campo>
      </Secao>

      {/* 6. Comportamento */}
      <Secao titulo="6. Comportamento do bot" desc="Configure como o bot lida com contatos e quando deve chamar você.">
        <Campo label="Número de atendimento"
          hint="Se for seu número pessoal, o bot ignora automaticamente quem está na sua agenda de contatos.">
          <div style={{ display: "flex", gap: 12 }}>
            {[
              { id: "chip", label: "📱 Chip exclusivo da lavanderia", desc: "Número separado, bot atende todo mundo" },
              { id: "pessoal", label: "👤 Número pessoal do dono", desc: "Bot ignora contatos salvos na agenda" },
            ].map((op) => (
              <button key={op.id} onClick={() => set("numeroTipo", op.id)} style={{
                flex: 1, padding: "14px 16px", borderRadius: 10, textAlign: "left",
                border: `2px solid ${config.numeroTipo === op.id ? "var(--turq)" : "var(--border)"}`,
                background: config.numeroTipo === op.id ? "var(--turq-light)" : "#fff",
                cursor: "pointer",
              }}>
                <div style={{ fontWeight: 700, fontSize: ".9rem", marginBottom: 4 }}>{op.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>{op.desc}</div>
              </button>
            ))}
          </div>
        </Campo>

        <Campo label="Quando me chamar"
          hint="O bot para automaticamente e te avisa quando qualquer uma dessas situações acontecer.">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ESCALACOES_PADRAO.map((e) => (
              <label key={e.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                padding: "10px 14px", borderRadius: 8,
                background: config.escalacoes.includes(e.id) ? "var(--turq-light)" : "var(--bg)",
                border: `1.5px solid ${config.escalacoes.includes(e.id) ? "var(--turq)" : "var(--border)"}`,
                transition: "all .15s",
              }}>
                <input
                  type="checkbox"
                  checked={config.escalacoes.includes(e.id)}
                  onChange={() => toggleEscalacao(e.id)}
                  style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0 }}
                />
                <span style={{ fontSize: ".9rem" }}>{e.label}</span>
              </label>
            ))}
          </div>
        </Campo>

        <Campo label="Outras situações (opcional)"
          hint="Descreva situações específicas que o bot deve reconhecer e te chamar.">
          <Textarea
            value={config.escalacaoCustom}
            onChange={(e) => set("escalacaoCustom", e.target.value)}
            placeholder="Ex: Se o cliente mencionar o nome 'Maria', me chame. Se perguntar sobre desconto acima de 20%, me chame."
            rows={3}
          />
        </Campo>
      </Secao>

      {/* 7. Mensagem de boas-vindas e áudio */}
      <Secao titulo="7. Atendimento automático" desc="Configure a primeira mensagem e o suporte a áudio.">
        <Campo label="Mensagem de boas-vindas"
          hint="Enviada automaticamente quando um cliente novo manda a primeira mensagem.">
          <Textarea
            value={config.mensagemBoasVindas || ""}
            onChange={(e) => set("mensagemBoasVindas", e.target.value)}
            placeholder={`Olá! 👋 Sou o atendente virtual da ${nome || "lavanderia"}. Em que posso te ajudar hoje?`}
            rows={3}
          />
        </Campo>

        <Campo label="Transcrição de áudios">
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div
              onClick={() => set("transcricaoAudio", !config.transcricaoAudio)}
              style={{
                width: 44, height: 24, borderRadius: 99, cursor: "pointer",
                background: config.transcricaoAudio ? "var(--zap)" : "var(--border)",
                position: "relative", transition: "background .2s", flexShrink: 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: config.transcricaoAudio ? 23 : 3,
                transition: "left .2s",
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: ".9rem" }}>
                {config.transcricaoAudio ? "✅ Ativado" : "Desativado"}
              </div>
              <div style={{ fontSize: ".78rem", color: "var(--ink-soft)" }}>
                Quando ativado, o bot lê áudios enviados pelos clientes e responde normalmente. Requer configuração da chave OpenAI no servidor.
              </div>
            </div>
          </label>
        </Campo>
      </Secao>

      {/* 8. Preview */}
      <Secao titulo="8. Preview do prompt" desc="Veja como o bot vai ser instruído com base nas suas configurações.">
        <Btn variant="ghost" onClick={gerarPreview} disabled={loadingPreview}>
          {loadingPreview ? "Gerando..." : "🔍 Gerar preview"}
        </Btn>

        {mostrarPreview && (
          <div style={{
            marginTop: 16, background: "var(--ink)", color: "#E2F0F2",
            borderRadius: 10, padding: 20, fontFamily: "monospace", fontSize: ".8rem",
            lineHeight: 1.6, maxHeight: 400, overflowY: "auto",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {loadingPreview ? "Gerando..." : preview}
          </div>
        )}
      </Secao>

      {/* Botão salvar fixo */}
      <div className="config-save-bar">
        <Btn variant="ghost" onClick={gerarPreview} disabled={loadingPreview}>
          Visualizar prompt
        </Btn>
        <Btn onClick={salvar} disabled={salvando} variant="success">
          {salvando ? "Salvando..." : "💾 Salvar configuração"}
        </Btn>
      </div>

      <toast.ToastContainer />
    </div>
  );
}
