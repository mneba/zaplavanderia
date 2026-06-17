import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { Logo, Input, Btn } from "../components/ui.jsx";

export default function Cadastro() {
  const nav = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", nomeLavanderia: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleCadastro(e) {
    e.preventDefault();
    setErro("");
    if (form.senha.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres.");
    setLoading(true);
    try {
      const { token, usuario } = await api.cadastrar(form);
      localStorage.setItem("zap_token", token);
      localStorage.setItem("zap_usuario", JSON.stringify(usuario));
      nav("/configuracoes");
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #E3F4F7 0%, #F0F5F6 50%, #E8F8EE 100%)",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo />
          <div style={{
            marginTop: 14, background: "rgba(29,171,84,.1)", border: "1px solid rgba(29,171,84,.25)",
            borderRadius: 99, display: "inline-block", padding: "6px 18px",
            fontSize: ".85rem", fontWeight: 700, color: "var(--zap-deep)",
          }}>
            🎉 7 dias grátis — sem cartão de crédito
          </div>
        </div>

        <div style={{
          background: "#fff", borderRadius: "var(--radius)", border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)", padding: 32,
        }}>
          <h1 style={{ fontFamily: "var(--display)", fontSize: "1.4rem", marginBottom: 6 }}>
            Criar sua conta
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: ".88rem", marginBottom: 24 }}>
            Configure o bot em minutos e comece a atender 24h.
          </p>

          <form onSubmit={handleCadastro} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Nome da lavanderia *" value={form.nomeLavanderia}
              onChange={(e) => set("nomeLavanderia", e.target.value)}
              placeholder="Ex: Lavanderia do Centro" required />

            <Input label="Seu nome *" value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="João Silva" required />

            <Input label="E-mail *" type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="joao@email.com" required />

            <Input label="Senha *" type="password" value={form.senha}
              onChange={(e) => set("senha", e.target.value)}
              placeholder="Mínimo 6 caracteres" required />

            {erro && (
              <div style={{
                background: "var(--danger-light)", color: "var(--danger)",
                padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: ".88rem",
              }}>{erro}</div>
            )}

            <Btn type="submit" disabled={loading} variant="success"
              style={{ width: "100%", justifyContent: "center", marginTop: 8, padding: "14px" }}>
              {loading ? "Criando conta..." : "Começar 7 dias grátis →"}
            </Btn>
          </form>

          <p style={{ textAlign: "center", marginTop: 20, fontSize: ".83rem", color: "var(--ink-soft)" }}>
            Já tem conta? <Link to="/login" style={{ color: "var(--turq-deep)", fontWeight: 600 }}>Entrar</Link>
          </p>
        </div>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: ".78rem", color: "var(--ink-muted)" }}>
          Ao criar uma conta você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
