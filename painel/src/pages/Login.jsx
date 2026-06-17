import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Logo, Input, Btn } from "../components/ui.jsx";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const { token, usuario } = await api.login(email, senha);
      localStorage.setItem("zap_token", token);
      localStorage.setItem("zap_usuario", JSON.stringify(usuario));
      nav("/");
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #E3F4F7 0%, #F0F5F6 50%, #E8F8EE 100%)", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Logo />
          <p style={{ marginTop: 8, color: "var(--ink-soft)", fontSize: ".9rem" }}>Painel de atendimento</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 32 }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.4rem", marginBottom: 24 }}>Entrar na conta</h1>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dono@lavanderia.com" required autoFocus />
            <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="..." required />
            {erro && (<div style={{ background: "var(--danger-light)", color: "var(--danger)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: ".88rem" }}>{erro}</div>)}
            <Btn type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              {loading ? "Entrando..." : "Entrar"}
            </Btn>
          </form>
          <p style={{ textAlign: "center", marginTop: 20, fontSize: ".83rem", color: "var(--ink-soft)" }}>
            Nao tem conta?{" "}
            <Link to="/cadastro" style={{ color: "var(--turq-deep)", fontWeight: 600 }}>Comecar gratis</Link>
          </p>
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: ".82rem", color: "var(--ink-muted)" }}>
          Problemas para entrar? Fale com o suporte.
        </p>
      </div>
    </div>
  );
}