import React, { useState } from 'react';
import { 
  Plane, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Bell,
  BellRing
} from 'lucide-react';
import type { FlightItem } from '../types.ts';

interface AllFlightsRowProps {
  flight: FlightItem;
  isNotified: boolean;
  onToggleNotify: (flight: FlightItem) => void;
}

// Extrai estritamente apenas o número ou identificador do portão
function getGateNumberOnly(gateStr: string): string {
  if (!gateStr) return '-';
  const cleaned = gateStr
    .replace(/^port[aã]o\s*/i, '')
    .replace(/^gate\s*/i, '')
    .trim();
  return cleaned || gateStr;
}

export const AllFlightsRow: React.FC<AllFlightsRowProps> = ({ 
  flight, 
  isNotified, 
  onToggleNotify 
}) => {
  const [expanded, setExpanded] = useState(false);

  // Status badge styling
  const getStatusBadge = () => {
    const s = flight.status.toLowerCase();
    if (s.includes('decolou') || s.includes('partiu')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-slate-500" />
          <span>{flight.status}</span>
        </span>
      );
    }
    if (s.includes('embarque')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>{flight.status}</span>
        </span>
      );
    }
    if (s.includes('atras') || s.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>{flight.status}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{flight.status || 'Previsto'}</span>
      </span>
    );
  };

  const gateNumber = getGateNumberOnly(flight.gate);

  return (
    <div className={`border-b border-slate-100 last:border-b-0 transition-colors ${
      isNotified ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/90'
    }`}>
      {/* 
        Linha Única para a aba TODOS contendo exatamente na ordem:
        1. Hora
        2. Cia
        3. Destino
        4. Portão
        5. Status
      */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer select-none text-xs overflow-x-auto whitespace-nowrap"
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* 1. Hora */}
          <div className="w-14 sm:w-16 shrink-0 flex items-center gap-1 font-bold text-slate-900 font-mono tabular-nums text-xs sm:text-sm">
            <span>{flight.scheduled}</span>
            {flight.dateLabel && flight.dateLabel !== 'Hoje' && (
              <span className="text-[8px] font-bold text-sky-700 bg-sky-50 px-0.5 rounded border border-sky-100">
                {flight.dateLabel}
              </span>
            )}
          </div>

          {/* 2. Cia */}
          <div className="flex items-center gap-1.5 w-28 sm:w-32 shrink-0">
            {flight.companyLogoUrl ? (
              <img
                src={flight.companyLogoUrl}
                alt={flight.companyName}
                className="w-4 h-4 object-contain rounded bg-white p-0.5 border border-slate-100 shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <Plane className="w-2.5 h-2.5" />
              </div>
            )}
            <span className="font-bold text-slate-900 truncate text-xs">
              {flight.companyName}
            </span>
            <span className="font-mono text-slate-500 text-[11px] font-semibold">
              {flight.flight}
            </span>
          </div>

          {/* 3. Destino */}
          <div className="w-36 sm:w-48 shrink-0 truncate">
            <span className="font-semibold text-slate-800 text-xs">
              {flight.destination}
            </span>
          </div>

          {/* 4. Portão (só o número) */}
          <div className="w-10 sm:w-12 shrink-0 flex items-center justify-center font-mono font-bold text-slate-800 text-[11px] bg-slate-100/90 px-1 py-0.5 rounded border border-slate-200/80">
            {gateNumber}
          </div>

          {/* 5. Status */}
          <div className="w-24 sm:w-30 shrink-0 flex items-center">
            {getStatusBadge()}
          </div>
        </div>

        {/* Ações: Notificação e Expandir */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleNotify(flight);
            }}
            className={`p-1 rounded text-xs transition-all cursor-pointer ${
              isNotified
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isNotified ? 'Notificações ativas (clique para desativar)' : 'Receber alerta quando status mudar'}
          >
            {isNotified ? (
              <BellRing className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
          </button>

          <button 
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title={expanded ? 'Recolher detalhes' : 'Ver detalhes do voo'}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Detalhes Expandidos (opcional ao clicar) */}
      {expanded && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-400">Origem:</span>{' '}
            <span className="font-semibold text-slate-800">Confins (CNF)</span>
          </div>
          <div>
            <span className="text-slate-400">Destino:</span>{' '}
            <span className="font-semibold text-slate-800">{flight.destination}</span>
          </div>
          <div>
            <span className="text-slate-400">Terminal:</span>{' '}
            <span className="font-semibold text-slate-800">{flight.terminal || 'Terminal 1'}</span>
          </div>
          {flight.estimated && flight.estimated !== flight.scheduled && (
            <div>
              <span className="text-slate-400">Horário Estimado:</span>{' '}
              <span className="font-bold text-amber-700 font-mono">{flight.estimated}</span>
            </div>
          )}
          <a 
            href="https://www.bh-airport.com.br/pt-BR/find-your-flight"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 hover:underline inline-flex items-center gap-1 font-semibold ml-auto text-[11px]"
          >
            BH Airport Oficial <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
