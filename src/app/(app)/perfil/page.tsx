import { sessao } from "@/lib/sessao";
import { Aviso } from "@/components/ui";
import FormularioPerfil from "./formulario-perfil";

export const metadata = { title: "Meu perfil — Amigos da Bola" };

export default async function PaginaPerfil({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const { novo } = await searchParams;
  const { jogador, user } = await sessao();

  if (!jogador) {
    return (
      <Aviso>
        Não encontramos seu perfil. Saia do app e entre de novo — se continuar,
        fale com o organizador.
      </Aviso>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meu perfil</h1>
        <p className="mt-1 text-base text-slate-600">{user.email}</p>
      </div>

      {novo && (
        <Aviso tipo="info">
          Bem-vindo! Preencha sua posição e seu nível — é com isso que o sorteio
          monta times equilibrados.
        </Aviso>
      )}

      <FormularioPerfil jogador={jogador} />
    </div>
  );
}
