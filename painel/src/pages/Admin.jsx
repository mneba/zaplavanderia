import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { usePlano } from "../lib/usePlano.js";
import { ShieldAlert } from "lucide-react";

const PLANOS = ["TRIAL", "STARTER", "PRO"];

const corPlano = (p) =>
  p === "PRO" ? "#7C3AED" : p === "TRIAL" ? "#FFC53D" : "#46656E";

export default function Admin() {
  const { isSuperAdmin, loading: planoLoading } = usePlano();
  const [lavs, setLavs] = useState(null);
  const [erro, setErro] = useState(null);

  async function carregar() {
    try { setLavs(await api.listarLavanderias()); }
    catch (e) { setErro(e.message); }
  }

  useEffect(() => { if (isSuperAdmin) carregar(); }, [isSuperAdmin]);

  async function mudar(id, plano) {
    if (!confirm("Mudar plano para " + plano + "?")) return;
    try {
      await api.mudarPlano(id, plano);
      // Forca reload pra invalidar cache do usePlano em outras telas
      window.location.reload();
    } catch (e) { alert("Erro: " + e.message); }
  }

  if (planoLoading) return null;

  if (!isSuperAdmin) {
    return (
      <div style={{ maxWidth: 500, margin: "60px auto", textAlign: "center" }}>
        <ShieldAlert size={48} color="#DC2626" />
        <h2 style={{ marginTop: 16 }}>Acesso negado</h2>
        <p style={{ color: "#46656E", marginTop: 8 }}>Esta área é restrita a administradores.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Administração</h1>
      <p style={{ color: "#46656E", marginBottom: 24 }}>
        Gerencie as lavanderias da plataforma. Use com cuidado — mudar plano afeta cobrança e acessos.
      </p>

      {erro && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Erro: {erro}
        </div>
      )}

      {lavs === null && !erro && <div>Carregando...</div>}

      {lavs && lavs.length === 0 && <div>Nenhuma lavanderia cadastrada.</div>}

      {lavs && lavs.map((l) => (
        <div key={l.id} style={{
          background: "#fff", border: "1px solid #DEEBEE", borderRadius: 12,
          padding: 20, marginBottom: 14, display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <strong style={{ fontSize: "1.05rem" }}>{l.nome}</strong>
              <span style={{
                background: corPlano(l.plano), color: "#fff",
                padding: "2px 10px", borderRadius: 999, fontSize: ".75rem", fontWeight: 700,
              }}>
                {l.plano}
              </span>
            </div>
            <div style={{ fontSize: ".85rem", color: "#46656E" }}>
              <code>{l.slug}</code> · {l._count.conversas} conversas · {l._count.usuarios} usuário(s)
            </div>
            {l.usuarios && l.usuarios.length > 0 && (
              <div style={{ fontSize: ".78rem", color: "#9CA3AF", marginTop: 4 }}>
                {l.usuarios.map(u => u.email).join(", ")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {PLANOS.map((p) => (
              <button
                key={p}
                onClick={() => mudar(l.id, p)}
                disabled={l.plano === p}
                style={{
                  padding: "8px 14px", border: "1px solid #DEEBEE", borderRadius: 8,
                  background: l.plano === p ? corPlano(p) : "#fff",
                  color: l.plano === p ? "#fff" : "#0D2B33",
                  cursor: l.plano === p ? "default" : "pointer",
                  fontWeight: 600, fontSize: ".85rem",
                  opacity: l.plano === p ? 1 : 0.85,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
