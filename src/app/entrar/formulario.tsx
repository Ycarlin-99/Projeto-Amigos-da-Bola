"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { Aviso, Botao, Campo, Entrada } from "@/components/ui";

type Modo = "entrar" | "criar";

/**
 * Transforma o apelido no e-mail interno que o Supabase Auth exige.
 * O jogador nunca vê nem digita esse e-mail: para ele, o login é só
 * "apelido + senha". Precisa ser determinístico (mesmo apelido -> mesmo
 * e-mail) para o login reencontrar a conta criada no cadastro.
 */
export function apelidoParaEmail(apelido: string) {
  const marcasDeAcento = new RegExp("[\\u0300-\\u036f]", "g");
  const slug = apelido
    .normalize("NFD")
    .replace(marcasDeAcento, "") // "José" -> "Jose"
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // fica só letras e números
  return slug ? `${slug}@amigosdabola.app` : "";
}

/**
 * Login e cadastro na mesma tela, alternando por duas abas grandes.
 * Deliberadamente simples: apelido e senha, sem e-mail, sem captcha,
 * sem "força da senha". O público vai de 18 a 70 anos e muita gente desiste
 * na segunda tela.
 */
export default function FormularioEntrar() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    const email = apelidoParaEmail(apelido);
    if (!email) {
      setErro("Escolha um apelido com letras ou números.");
      setEnviando(false);
      return;
    }

    const supabase = criarClienteNavegador();

    const resposta =
      modo === "entrar"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({
            email,
            password: senha,
            options: {
              data: { nome: apelido.trim(), nome_completo: nomeCompleto.trim() },
            },
          });

    if (resposta.error) {
      setErro(traduzirErro(resposta.error.message));
      setEnviando(false);
      return;
    }

    if (modo === "criar" && !resposta.data.session) {
      // Só cai aqui se a confirmação de e-mail estiver ligada no Supabase —
      // o que trava o login por apelido, já que esse e-mail não recebe nada.
      setErro(
        "Conta criada, mas o acesso automático não veio. Peça ao organizador " +
          "para desligar a confirmação de e-mail no painel do Supabase.",
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
          <Campo rotulo="Nome completo">
            <Entrada
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome de verdade"
            />
          </Campo>
        )}

        <Campo
          rotulo="Apelido no futebol"
          dica={
            modo === "entrar"
              ? "O mesmo apelido que você usou no cadastro."
              : "É com ele que você entra e aparece na lista."
          }
        >
          <Entrada
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            required
            autoComplete="username"
            placeholder="Como te chamam na pelada"
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
  if (m.includes("invalid login credentials")) return "Apelido ou senha não conferem.";
  if (m.includes("user already registered"))
    return "Esse apelido já está em uso. Use a aba “Já tenho conta”.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "A confirmação de e-mail está ligada no Supabase — desligue-a para entrar por apelido.";
  if (m.includes("rate limit"))
    return "A confirmação de e-mail ainda está ligada no Supabase (Authentication → Email). Desligue-a e tente de novo.";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "Esse apelido tem caracteres que não dá para usar. Tente só letras e números.";
  if (m.includes("fetch")) return "Sem conexão com o servidor. Verifique a internet.";
  return "Não deu certo. Tente de novo em instantes.";
}
