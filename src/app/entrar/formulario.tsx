"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";

type Modo = "entrar" | "criar";

/**
 * Login e cadastro na mesma tela, alternando por duas abas grandes.
 * Deliberadamente simples: e-mail e senha, sem confirmar e-mail, sem captcha,
 * sem "força da senha". O público vai de 18 a 70 anos e muita gente desiste
 * na segunda tela.
 */
export default function FormularioEntrar() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    const supabase = criarClienteNavegador();

    const resposta =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        : await supabase.auth.signUp({
            email: email.trim(),
            password: senha,
            options: { data: { nome: nome.trim() } },
          });

    if (resposta.error) {
      setErro(traduzirErro(resposta.error.message));
      setEnviando(false);
      return;
    }

    if (modo === "criar" && !resposta.data.session) {
      setErro(
        "Conta criada! Confirme o e-mail que enviamos e depois entre por aqui.",
      );
      setModo("entrar");
      setEnviando(false);
      return;
    }

    // Primeiro acesso vai direto completar o perfil; o resto vai para os jogos.
    router.replace(modo === "criar" ? "/perfil?novo=1" : "/partidas");
    router.refresh();
  }

  return (
    <div className="cartao p-6">
      <div
        role="tablist"
        aria-label="Entrar ou criar conta"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
      >
        {(["entrar", "criar"] as const).map((valor) => (
          <button
            key={valor}
            role="tab"
            type="button"
            aria-selected={modo === valor}
            onClick={() => {
              setModo(valor);
              setErro("");
            }}
            className={`rounded-lg px-4 py-2.5 text-base font-semibold transition-colors ${
              modo === valor
                ? "bg-white text-marinho-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {valor === "entrar" ? "Já tenho conta" : "Sou novo aqui"}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} className="space-y-4">
        {modo === "criar" && (
          <Campo rotulo="Seu nome">
            <Entrada
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              placeholder="Como te chamam no grupo"
            />
          </Campo>
        )}

        <Campo rotulo="E-mail">
          <Entrada
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
          />
        </Campo>

        <Campo rotulo="Senha" dica={modo === "criar" ? "Mínimo de 6 letras ou números." : undefined}>
          <Entrada
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            autoComplete={modo === "criar" ? "new-password" : "current-password"}
            placeholder="••••••"
          />
        </Campo>

        <Aviso>{erro}</Aviso>

        <Botao type="submit" disabled={enviando} className="w-full">
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar minha conta"}
        </Botao>
      </form>
    </div>
  );
}

/** As mensagens do Supabase vêm em inglês e técnicas demais para este público. */
function traduzirErro(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("user already registered")) return "Esse e-mail já tem conta. Use a aba “Já tenho conta”.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email not confirmed")) return "Confirme o e-mail que enviamos antes de entrar.";
  if (m.includes("unable to validate email")) return "Esse e-mail parece inválido.";
  if (m.includes("fetch")) return "Sem conexão com o servidor. Verifique a internet.";
  return "Não deu certo. Tente de novo em instantes.";
}
