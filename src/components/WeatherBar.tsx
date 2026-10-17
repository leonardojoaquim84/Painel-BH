import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { AirportWeather } from '../types.ts';

interface WeatherBarProps {
  weatherList: AirportWeather[];
  loading: boolean;
}

export const WeatherBar: React.FC<WeatherBarProps> = ({ weatherList }) => {
  const [copiedStation, setCopiedStation] = useState<string | null>(null);

  const handleCopy = (icao: string, metar: string) => {
    navigator.clipboard?.writeText(metar);
    setCopiedStation(icao);
    setTimeout(() => setCopiedStation(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {weatherList.map((item) => {
          const isCopied = copiedStation === item.icao;
          const isVFR = item.fltCat === 'VFR';
          const isIFR = item.fltCat === 'IFR';

          return (
            <div
              key={item.icao || item.code}
              className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    {item.icao}
                  </span>
                  <span className="text-slate-400 text-xs">·</span>
                  <span className="text-slate-700 text-xs font-semibold">
                    {item.code === 'CNF' ? 'Confins' : item.code === 'GIG' ? 'Galeão' : 'Santos Dumont'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                      isVFR
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : isIFR
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {item.fltCat || 'VFR'}
                  </span>

                  <button
                    onClick={() => handleCopy(item.icao, item.metar)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Copiar código METAR"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* METAR String com fundo claro e amigável */}
              <div className="bg-slate-100/90 text-slate-800 font-mono text-[11px] p-2 rounded-md leading-relaxed select-all tracking-tight break-all border border-slate-200">
                {item.metar || `METAR ${item.icao} 171400Z 12006KT 9999 FEW025 24/18 Q1016`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
