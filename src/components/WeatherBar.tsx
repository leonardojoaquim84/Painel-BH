import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { AirportWeather } from '../types.ts';

interface WeatherBarProps {
  weatherList: AirportWeather[];
  loading: boolean;
}

interface SearchedMetar {
  icao: string;
  metar: string;
  fltCat: string;
}

// Retorna as classes de cor de fundo e borda baseadas na categoria de voo (VFR verde, MVFR amarelo, IFR vermelho)
function getMetarBoxClasses(fltCat?: string): string {
  const cat = (fltCat || 'VFR').toUpperCase();
  if (cat === 'VFR') {
    return 'bg-emerald-100/90 border-emerald-300 text-emerald-950';
  }
  if (cat === 'MVFR') {
    return 'bg-amber-100/90 border-amber-300 text-amber-950';
  }
  if (cat === 'IFR') {
    return 'bg-rose-100/90 border-rose-300 text-rose-950';
  }
  if (cat === 'LIFR') {
    return 'bg-purple-100/90 border-purple-300 text-purple-950';
  }
  return 'bg-slate-100 border-slate-300 text-slate-900';
}

export const WeatherBar: React.FC<WeatherBarProps> = ({ weatherList }) => {
  const [searchIcao, setSearchIcao] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedResult, setSearchedResult] = useState<SearchedMetar | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchMetar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchIcao.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean) return;

    try {
      setSearching(true);
      setSearchError(null);

      // 1. Tenta buscar pelo endpoint do servidor /api/metar (resolve IATA e ICAO)
      const res = await fetch(`/api/metar?icao=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const j = await res.json();
        if (j.success && j.data && j.data.metar) {
          setSearchedResult({
            icao: j.data.icao || clean,
            metar: j.data.metar,
            fltCat: (j.data.fltCat || 'VFR').toUpperCase(),
          });
          return;
        }
      }

      // 2. Fallback direto caso o endpoint local falhe
      const queryCode = clean.length === 3 ? `SB${clean},${clean}` : clean;
      const directRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${queryCode}&format=json`);
      if (directRes.ok) {
        const data = await directRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          setSearchedResult({
            icao: item.icaoId || clean,
            metar: item.rawOb || `METAR ${clean} indisponível`,
            fltCat: (item.fltCat || 'VFR').toUpperCase(),
          });
          return;
        }
      }

      setSearchError(`METAR não encontrado para "${clean}". Digite o código ICAO (ex: SBGR, SBSP, SBBR) ou IATA (ex: GRU, CGH, BSB).`);
      setSearchedResult(null);
    } catch {
      setSearchError(`Não foi possível carregar o METAR de ${clean}. Verifique a conexão.`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-3">
      {/* 
        Grid com os 3 METARs (Confins, Galeão, Santos Dumont):
        - Sem título
        - Sem botão de copiar
        - Sem texto 'VFR' escrito
        - Todo o box colorido com a respectiva cor da condição meteorológica (VFR verde, MVFR amarelo, IFR vermelho)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {weatherList.map((item) => {
          const colorClass = getMetarBoxClasses(item.fltCat);
          const rawMetar = item.metar || `METAR ${item.icao} 181000Z 12006KT 9999 FEW025 24/18 Q1016`;

          return (
            <div
              key={item.icao || item.code}
              className={`p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed select-all tracking-tight break-all font-semibold shadow-2xs transition-colors ${colorClass}`}
            >
              {rawMetar}
            </div>
          );
        })}
      </div>

      {/* Box para pesquisar o METAR de qualquer outro aeroporto */}
      <div className="pt-2 border-t border-slate-100">
        <form onSubmit={handleSearchMetar} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchIcao}
              onChange={(e) => setSearchIcao(e.target.value.toUpperCase())}
              placeholder="Pesquisar METAR de outro aeroporto (código ICAO ou IATA: ex. SBGR, GRU, SBSP, CGH, BSB, KJFK)..."
              maxLength={6}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400 font-mono uppercase focus:outline-hidden focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={searching || !searchIcao.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-xs cursor-pointer shrink-0"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>{searching ? 'Buscando...' : 'Buscar METAR'}</span>
          </button>
        </form>

        {/* Mensagem de Erro na busca */}
        {searchError && (
          <div className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-200">
            {searchError}
          </div>
        )}

        {/* Resultado da pesquisa de METAR com o mesmo layout e fundo colorido */}
        {searchedResult && (
          <div className="mt-2.5">
            <div className={`p-2.5 rounded-lg border font-mono text-[11px] leading-relaxed select-all tracking-tight break-all font-semibold shadow-2xs ${getMetarBoxClasses(searchedResult.fltCat)}`}>
              {searchedResult.metar}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
