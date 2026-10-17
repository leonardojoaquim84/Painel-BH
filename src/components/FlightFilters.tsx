import React from 'react';
import { Filter } from 'lucide-react';
import type { DestinationAirport } from '../types.ts';

interface FlightFiltersProps {
  selectedAirport: 'ALL' | DestinationAirport;
  onSelectAirport: (dest: 'ALL' | DestinationAirport) => void;
  selectedAirline: string;
  onSelectAirline: (airline: string) => void;
  availableAirlines: string[];
}

export const FlightFilters: React.FC<FlightFiltersProps> = ({
  selectedAirport,
  onSelectAirport,
  selectedAirline,
  onSelectAirline,
  availableAirlines,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
      {/* Abas: TODOS RIO, GIG, SDU */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg shrink-0">
        <button
          type="button"
          onClick={() => onSelectAirport('ALL')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
            selectedAirport === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TODOS RIO
        </button>

        <button
          type="button"
          onClick={() => onSelectAirport('GIG')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
            selectedAirport === 'GIG'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          GIG
        </button>

        <button
          type="button"
          onClick={() => onSelectAirport('SDU')}
          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
            selectedAirport === 'SDU'
              ? 'bg-white text-teal-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          SDU
        </button>
      </div>

      {/* CIA Dropdown */}
      <div className="flex items-center gap-1.5 text-xs shrink-0">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-700 font-bold">CIA:</span>
        <select
          value={selectedAirline}
          onChange={(e) => onSelectAirline(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 cursor-pointer"
        >
          <option value="ALL">Todas as Cias</option>
          {availableAirlines.map((airline) => (
            <option key={airline} value={airline}>
              {airline}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
