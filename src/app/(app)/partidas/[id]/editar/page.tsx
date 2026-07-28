import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/sessao";
import type { Partida } from "@/lib/tipos";
import { editarPartida } from "../../acoes";
import FormularioPartida from "../../formulario-partida";

export const metadata = { title: "Editar jogo — Amigos da Bola" };

export default async function PaginaEditarPartida({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();

  const { data } = await supabase.from("partidas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Editar jogo</h1>
      <FormularioPartida
        acao={editarPartida.bind(null, id)}
        partida={data as Partida}
        rotuloEnvio="Salvar alterações"
      />
    </div>
  );
}
