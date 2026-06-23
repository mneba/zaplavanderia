import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";

export default function BloqueioPro({ feature, descricao }) {
  return (
    <div style={{ maxWidth: 540, margin: "60px auto", textAlign: "center", padding: "0 20px" }}>
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(124,58,237,0.12)", display: "inline-flex", alignItems: "center",
        justifyContent: "center", marginBottom: 22,
      }}>
        <Lock size={36} color="#7C3AED" />
      </div>
      <h2 style={{ fontSize: "1.4rem", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Sparkles size={20} color="#7C3AED" /> {feature}
      </h2>
      <p style={{ color: "var(--ink-muted, #46656E)", marginBottom: 28, lineHeight: 1.6, fontSize: "0.98rem" }}>
        {descricao || "Essa funcionalidade faz parte do plano Pro. Faca upgrade pra liberar."}
      </p>
      <Link to="/planos" style={{
        display: "inline-block", background: "#7C3AED", color: "#fff",
        padding: "13px 28px", borderRadius: 999, textDecoration: "none",
        fontWeight: 700, fontSize: "0.95rem",
        boxShadow: "0 6px 18px rgba(124,58,237,0.3)",
      }}>
        Ver planos e fazer upgrade
      </Link>
    </div>
  );
}
