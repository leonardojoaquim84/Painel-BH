import React from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import type { DollarQuote } from '../types.ts';

interface HeaderProps {
  currentTime: string;
  dollar: DollarQuote | null;
  dollarLoading: boolean;
  flightsLoading: boolean;
  onRefresh: () => void;
  autoRefreshCountdown: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTime,
  dollar,
  dollarLoading,
  flightsLoading,
  onRefresh,
  autoRefreshCountdown,
}) => {
  const isRefreshing = dollarLoading || flightsLoading;

  // Garantir estritamente 2 casas decimais no valor do dólar
  const formattedDollar = (() => {
    if (dollar?.numericRate && !isNaN(dollar.numericRate)) {
      return dollar.numericRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (dollar?.rate) {
      const parsed = parseFloat(dollar.rate.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(parsed)) {
        return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
    return '5,06';
  })();

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap">
          {/* Canto Esquerdo: Hora Atual, Dólar e Botão Atualizar (com countdown de 10s) na mesma linha */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Hora Atual */}
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-mono tabular-nums">
              {currentTime}
            </span>

            <span className="text-slate-300 font-light">|</span>

            {/* Dólar Comercial com 2 decimais */}
            <div className="flex items-baseline gap-1 text-xs sm:text-sm font-bold bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/80">
              <span className="text-slate-600 font-semibold text-[11px] sm:text-xs">Dólar:</span>
              <span className="font-mono tabular-nums text-emerald-700 font-extrabold text-xs sm:text-sm">
                R$ {formattedDollar}
              </span>
            </div>

            {/* Botão Atualizar com Countdown de 10s */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all focus:outline-hidden cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                isRefreshing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-sky-600/10'
              }`}
              title="Clique para atualizar manualmente ou aguarde a atualização automática a cada 10 segundos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
              <span className="font-mono text-[11px] bg-sky-800/90 text-sky-100 px-1.5 py-0.2 rounded font-black tabular-nums">
                {autoRefreshCountdown}s
              </span>
            </button>
          </div>

          {/* Canto Direito: Botões PASSE AZUL, PASSE GOL e FLIGHT RADAR */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="https://passelivre.voeazul.com.br/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-white bg-[#002f6c] hover:bg-[#00214c] transition-all shadow-xs shrink-0 cursor-pointer"
              title="Acessar Passe Livre Azul"
            >
              <span>PASSE AZUL</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>

            <a
              href="https://passelivre.voegol.com.br/Login.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-white bg-[#ff5a00] hover:bg-[#e04f00] transition-all shadow-xs shrink-0 cursor-pointer"
              title="Acessar Passe Livre GOL"
            >
              <span>PASSE GOL</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>

            <a
              href="https://apps.apple.com/br/app/flightradar24-flight-tracker/id382233851"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-slate-900 bg-amber-300 hover:bg-amber-400 transition-all shadow-xs shrink-0 cursor-pointer"
              title="Abrir app Flightradar24"
            >
              <span>FLIGHT RADAR</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
