import { exigirAdmin } from "@/lib/sessao";
import { criarPartida } from "../acoes";
import FormularioPartida from "../formulario-partida";

export const metadata = { title: "Novo jogo — Amigos da Bola" };

export default async function PaginaNovaPartida() {
  await exigirAdmin();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Marcar um jogo</h1>
      <FormularioPartida acao={criarPartida} rotuloEnvio="Marcar jogo" />
    </div>
  );
}
