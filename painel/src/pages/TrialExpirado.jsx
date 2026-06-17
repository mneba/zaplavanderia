import { Logo } from "../components/ui.jsx";

export default function TrialExpirado() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #E3F4F7 0%, #F0F5F6 50%, #E8F8EE 100%)",
      padding: 20,
    }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <Logo />
        <div style={{
          marginTop: 32, background: "#fff", borderRadius: "var(--radius)",
          border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 40,
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.5rem", marginBottom: 12 }}>
            Seu período de teste encerrou
          </h1>
          <p style={{ color: "var(--ink-soft)", marginBottom: 28, lineHeight: 1.6 }}>
            Esperamos que esses 7 dias tenham mostrado o valor do ZapLavanderia. Para continuar atendendo seus clientes 24h, escolha um plano.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            <a
              href="https://wa.me/5511951457902?text=Quero%20contratar%20o%20plano%20Starter%20do%20ZapLavanderia."
              target="_blank" rel="noopener"
              style={{
                display: "block", padding: "14px 20px", borderRadius: "var(--radius-sm)",
                background: "var(--bg)", border: "2px solid var(--border)",
                textDecoration: "none", color: "var(--ink)", transition: "border-color .15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Starter</div>
              <div style={{ fontSize: "1.4rem", fontFamily: "var(--display)", fontWeight: 800, color: "var(--turq-deep)" }}>R$ 149<span style={{ fontSize: ".9rem", fontWeight: 400 }}>/mês</span></div>
              <div style={{ fontSize: ".82rem", color: "var(--ink-soft)", marginTop: 4 }}>Bot 24h + Painel de conversas</div>
            </a>

            <a
              href="https://wa.me/5511951457902?text=Quero%20contratar%20o%20plano%20Pro%20do%20ZapLavanderia."
              target="_blank" rel="noopener"
              style={{
                display: "block", padding: "14px 20px", borderRadius: "var(--radius-sm)",
                background: "var(--pro-light)", border: "2px solid var(--pro)",
                textDecoration: "none", color: "var(--ink)", position: "relative",
              }}
            >
              <span style={{
                position: "absolute", top: -12, right: 16,
                background: "var(--pro)", color: "#fff",
                fontSize: ".72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99,
              }}>⭐ Mais escolhido</span>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Pro</div>
              <div style={{ fontSize: "1.4rem", fontFamily: "var(--display)", fontWeight: 800, color: "var(--pro)" }}>R$ 249<span style={{ fontSize: ".9rem", fontWeight: 400, color: "var(--ink)" }}>/mês</span></div>
              <div style={{ fontSize: ".82rem", color: "var(--ink-soft)", marginTop: 4 }}>Tudo do Starter + Disparo de cupons pra base</div>
            </a>
          </div>

          <p style={{ fontSize: ".82rem", color: "var(--ink-muted)" }}>
            Fale com a gente no WhatsApp e ativamos seu plano em minutos.
          </p>
        </div>
      </div>
    </div>
  );
}
