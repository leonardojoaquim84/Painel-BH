import React, { useState } from 'react';
import { 
  Plane, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Timer,
  Bell,
  BellRing
} from 'lucide-react';
import type { FlightItem } from '../types.ts';
import { getFlightCountdown } from '../utils/time.ts';

interface FlightRowProps {
  flight: FlightItem;
  currentTimeMs: number;
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

export const FlightRow: React.FC<FlightRowProps> = ({ 
  flight, 
  currentTimeMs, 
  isNotified, 
  onToggleNotify 
}) => {
  const [expanded, setExpanded] = useState(false);

  const countdown = getFlightCountdown(flight.departureTimestamp, flight.status, currentTimeMs);

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

  // Countdown styling based on statusType
  const getCountdownDisplay = () => {
    switch (countdown.statusType) {
      case 'imminent':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold tabular-nums shrink-0">
            <Timer className="w-3 h-3 text-amber-700 animate-pulse" />
            <span>{countdown.text}</span>
          </div>
        );
      case 'now':
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-300 font-mono text-[11px] font-bold tabular-nums shrink-0">
            <Plane className="w-3 h-3 text-sky-700 animate-bounce" />
            <span>{countdown.text}</span>
          </div>
        );
      case 'departed':
        return (
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono tabular-nums shrink-0">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            <span>{countdown.text}</span>
          </div>
        );
      case 'canceled':
        return (
          <div className="flex items-center gap-1 text-[11px] text-rose-700 font-medium shrink-0">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Cancelado</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[11px] font-semibold tabular-nums shrink-0">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{countdown.text}</span>
          </div>
        );
    }
  };

  const isSDU = flight.destinationCode === 'SDU';
  const gateNumber = getGateNumberOnly(flight.gate);

  return (
    <div className={`border-b border-slate-100 last:border-b-0 transition-colors ${
      isNotified ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-slate-50/90'
    }`}>
      {/* 
        Linha Única Ultra-Condensada:
        1. Apenas Logo + Número do voo (sem nome da cia)
        2. Destino (GIG ou SDU) logo ao lado sem espaçamento excessivo
        3. Status do voo
        4. Portão de embarque com cor marrom bem claro
        5. Tempo para decolagem
        6. Hora de decolagem
      */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="px-2 sm:px-3 py-1.5 flex items-center justify-between gap-1 sm:gap-2 cursor-pointer select-none text-xs overflow-x-auto whitespace-nowrap"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1. Logotipo da Cia e Número do Voo (sem o nome da companhia para economizar espaço horizontal) */}
          <div className="flex items-center gap-1 shrink-0">
            {flight.companyLogoUrl ? (
              <img
                src={flight.companyLogoUrl}
                alt={flight.companyName}
                className="w-4 h-4 object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
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
            <span className="font-mono text-slate-900 font-black text-xs tabular-nums">
              {flight.flight}
            </span>
          </div>

          {/* 2. Destino (GIG ou SDU) logo ao lado com espaço reduzido */}
          <div className="shrink-0">
            <span 
              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black font-mono border ${
                isSDU
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              {isSDU ? 'SDU' : 'GIG'}
            </span>
          </div>

          {/* 3. Status do voo */}
          <div className="shrink-0 flex items-center">
            {getStatusBadge()}
          </div>

          {/* 4. Portão de embarque com cor marrom bem claro */}
          <div className="shrink-0 flex items-center justify-center font-mono font-bold text-[11px] bg-[#fbf4eb] text-[#854d0e] border border-[#ebd9c6] px-1.5 py-0.5 rounded">
            {gateNumber}
          </div>

          {/* 5. Tempo para a decolagem */}
          <div className="shrink-0 flex items-center">
            {getCountdownDisplay()}
          </div>

          {/* 6. Hora de decolagem */}
          <div className="shrink-0 flex items-center gap-1 font-black text-slate-900 font-mono tabular-nums text-xs sm:text-sm">
            <span>{flight.scheduled}</span>
            {flight.dateLabel && flight.dateLabel !== 'Hoje' && (
              <span className="text-[8px] font-bold text-sky-700 bg-sky-50 px-0.5 rounded border border-sky-100">
                {flight.dateLabel}
              </span>
            )}
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

      {/* Detalhes Expandidos */}
      {expanded && (
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-slate-400">Companhia:</span>{' '}
            <span className="font-semibold text-slate-800">{flight.companyName}</span>
          </div>
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
