/** Esqueleto enquanto a página carrega — melhor que tela branca em 4G ruim. */
export default function Carregando() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="cartao h-36 animate-pulse bg-slate-100" />
      ))}
    </div>
  );
}
