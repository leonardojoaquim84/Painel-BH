import React from 'react';
import { RefreshCw, ExternalLink, PlaneTakeoff } from 'lucide-react';
import type { DollarQuote } from '../types.ts';

interface HeaderProps {
  currentTime: string;
  currentDate: string;
  dollar: DollarQuote | null;
  dollarLoading: boolean;
  flightsLoading: boolean;
  onRefresh: () => void;
  lastUpdatedTime: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTime,
  dollar,
  dollarLoading,
  flightsLoading,
  onRefresh,
}) => {
  const isRefreshing = dollarLoading || flightsLoading;

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Canto Superior Esquerdo: Hora Atual como Título Principal */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 shrink-0 hidden xs:flex">
              <PlaneTakeoff className="w-5 h-5" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
              {currentTime}
            </h1>
          </div>

          {/* Canto Superior Direito: Botões de Acesso Rápido + Dólar e Botão Atualizar ao Lado */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
            {/* Botões PASSE AZUL, PASSE GOL e FLIGHT RADAR */}
            <div className="flex items-center gap-2">
              <a
                href="https://passelivre.voeazul.com.br/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-[#002f6c] hover:bg-[#00214c] active:bg-[#001736] transition-all shadow-xs shrink-0 cursor-pointer"
                title="Acessar Passe Livre Azul"
              >
                <span>PASSE AZUL</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              <a
                href="https://passelivre.voegol.com.br/Login.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-[#ff5a00] hover:bg-[#e04f00] active:bg-[#c44400] transition-all shadow-xs shrink-0 cursor-pointer"
                title="Acessar Passe Livre GOL"
              >
                <span>PASSE GOL</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              <a
                href="https://apps.apple.com/br/app/flightradar24-flight-tracker/id382233851"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-slate-900 bg-amber-300 hover:bg-amber-400 active:bg-amber-500 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Abrir app Flightradar24"
              >
                <span>FLIGHT RADAR</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>

            {/* Dólar e Botão de Atualização Manual ao Lado no Canto Superior Direito */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-baseline gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                <span className="text-xs font-bold text-slate-700">Dólar</span>
                {dollarLoading && !dollar ? (
                  <span className="text-slate-400 font-mono text-xs animate-pulse">...</span>
                ) : (
                  <span className="font-mono tabular-nums text-emerald-700 font-bold text-sm">
                    R$ {dollar?.rate || '5,0640'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500/40 cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                  isRefreshing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-sky-600/10'
                }`}
                title="Clique para atualizar o status dos voos e o dólar em tempo real"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
