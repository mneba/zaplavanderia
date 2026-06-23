import { Check, X, Crown } from "lucide-react";
import { usePlano } from "../lib/usePlano.js";

const PLANOS = [
  {
    nome: "Starter",
    preco: 99,
    desc: "Bot 24h + painel. Ideal pra comecar.",
    features: [
      { ok: true, text: "Bot com IA atendendo 24h" },
      { ok: true, text: "Painel de conversas em tempo real" },
      { ok: true, text: "Transcricao de audios" },
      { ok: true, text: "Itens aceitos para lavagem" },
      { ok: true, text: "Intervencao humana" },
      { ok: false, text: "Midias automaticas (foto/video)" },
      { ok: false, text: "Disparo de cupons" },
    ],
  },
  {
    nome: "Pro",
    preco: 149,
    destaque: true,
    desc: "Tudo do Starter + midias automaticas + disparo.",
    features: [
      { ok: true, text: "Tudo do Starter" },
      { ok: true, text: "Midias automaticas (foto/video)" },
      { ok: true, text: "Disparo de cupons pra base" },
      { ok: true, text: "Base ilimitada de clientes" },
    ],
  },
];

function PlanoCard({ p, planoAtual }) {
  const atual =
    planoAtual === p.nome.toUpperCase() ||
    (p.nome === "Pro" && planoAtual === "TRIAL");

  const linkUpgrade =
    "https://wa.me/5511951457902?text=Quero%20fazer%20upgrade%20para%20o%20plano%20" +
    encodeURIComponent(p.nome);

  return (
    <div style={{
      border: p.destaque ? "2px solid #7C3AED" : "1px solid #DEEBEE",
      borderRadius: 16, padding: 28, background: "#fff", position: "relative",
      boxShadow: p.destaque ? "0 0 0 4px #EDE9FE" : "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {p.destaque && (
        <span style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "#7C3AED", color: "#fff", padding: "4px 14px",
          borderRadius: 999, fontSize: ".75rem", fontWeight: 700, whiteSpace: "nowrap",
        }}>
          <Crown size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
          Mais escolhido
        </span>
      )}
      <h3 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{p.nome}</h3>
      <div style={{ fontSize: "2.2rem", fontWeight: 800, marginBottom: 6, lineHeight: 1 }}>
        R$ {p.preco}<span style={{ fontSize: "1rem", fontWeight: 400, color: "#46656E" }}>/mes</span>
      </div>
      <p style={{ color: "#46656E", fontSize: ".9rem", marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #DEEBEE" }}>
        {p.desc}
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
        {p.features.map((f, i) => (
          <li key={i} style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
            fontSize: ".93rem", color: f.ok ? "#0D2B33" : "#9CA3AF",
          }}>
            {f.ok ? <Check size={16} color="#1DAB54" /> : <X size={16} color="#9CA3AF" />}
            {f.text}
          </li>
        ))}
      </ul>
      {atual ? (
        <div style={{
          textAlign: "center", padding: "13px", background: "#F6FAFB",
          borderRadius: 999, fontWeight: 600, color: "#46656E", fontSize: ".95rem",
        }}>Plano atual</div>
      ) : (
        <a href={linkUpgrade} target="_blank" rel="noopener noreferrer" style={{
          display: "block", textAlign: "center", padding: "13px",
          background: p.destaque ? "#7C3AED" : "#1DAB54", color: "#fff",
          borderRadius: 999, fontWeight: 700, textDecoration: "none", fontSize: ".95rem",
          boxShadow: p.destaque ? "0 6px 18px rgba(124,58,237,0.3)" : "0 6px 18px rgba(29,171,84,0.3)",
        }}>
          {p.nome === "Starter" ? "Quero Starter" : "Fazer upgrade pra Pro"}
        </a>
      )}
    </div>
  );
}

export default function Planos() {
  const { plano } = usePlano();
  return (
    <div style={{ maxWidth: 880, margin: "20px auto", padding: "0 20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 8 }}>Planos</h1>
      <p style={{ textAlign: "center", color: "#46656E", marginBottom: 36 }}>
        Sem fidelidade. Pagamentos manuais por enquanto (fale com a gente no WhatsApp).
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {PLANOS.map((p) => <PlanoCard key={p.nome} p={p} planoAtual={plano} />)}
      </div>
    </div>
  );
}
