/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plane, 
  Bell, 
  BellRing, 
  ExternalLink, 
  ArrowUpDown,
  RefreshCw,
  Filter
} from 'lucide-react';
import type { FlightItem, DollarQuote, AirportWeather, FlightStatusAlert, DestinationAirport } from './types.ts';
import { formatLiveTime, formatLiveDate } from './utils/time.ts';
import { playAirportChime } from './utils/audio.ts';
import { Header } from './components/Header.tsx';
import { WeatherBar } from './components/WeatherBar.tsx';
import { FlightFilters } from './components/FlightFilters.tsx';
import { FlightRow } from './components/FlightRow.tsx';
import { AllFlightsRow } from './components/AllFlightsRow.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';

// Remove aeronaves que já decolaram
function isFlightNotDeparted(flight: FlightItem, currentTimeMs: number): boolean {
  const s = (flight.status || '').toLowerCase().trim();
  if (
    s.includes('decolou') ||
    s.includes('partiu') ||
    s.includes('finalizado') ||
    s.includes('encerrado')
  ) {
    return false;
  }
  // Se o horário previsto já passou há mais de 10 minutos e o status não é de atraso ou embarque
  if (flight.departureTimestamp && currentTimeMs - flight.departureTimestamp > 10 * 60 * 1000) {
    if (!s.includes('atras') && !s.includes('embarque') && !s.includes('aguardando')) {
      return false;
    }
  }
  return true;
}

export default function App() {
  // Live clock
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(formatLiveTime());
  const [currentDate, setCurrentDate] = useState(formatLiveDate());

  // Dollar state
  const [dollar, setDollar] = useState<DollarQuote | null>(null);
  const [dollarLoading, setDollarLoading] = useState(true);

  // Flights state
  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [flightsLoading, setFlightsLoading] = useState(true);

  // Weather state
  const [weatherList, setWeatherList] = useState<AirportWeather[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Main navigation tab: Sempre abre na aba RIO por padrão
  const [mainTab, setMainTab] = useState<'RIO' | 'TODOS'>('RIO');

  // Auto-refresh countdown (10 segundos)
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(10);

  // Notifications & tracking state
  const [monitoredFlightIds, setMonitoredFlightIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bh_monitored_flights');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<FlightStatusAlert[]>(() => {
    try {
      const saved = localStorage.getItem('bh_flight_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [previousStatuses, setPreviousStatuses] = useState<{ [id: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('bh_flight_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bh_sound_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Browser notification permission
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // Filtering states para a aba RIO (TODOS RIO, GIG, SDU) e CIA
  const [selectedAirport, setSelectedAirport] = useState<'ALL' | DestinationAirport>('ALL');
  const [selectedAirline, setSelectedAirline] = useState('ALL');
  const [showNext12HoursOnly, setShowNext12HoursOnly] = useState(true);

  // Toast timer ref
  const toastTimeoutRef = useRef<number | null>(null);

  // Show transient toast notification
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTimeMs(now);
      setCurrentTime(formatLiveTime());
      setCurrentDate(formatLiveDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check browser notification support safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
        setBrowserPermission(Notification.permission);
      } else {
        setBrowserPermission('unsupported');
      }
    } catch {
      setBrowserPermission('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification) {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          showToast('Permissão para notificações ativada com sucesso!');
        }
      }
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
    }
  };

  // Fetch Dollar com verificação de JSON e fallback para AwesomeAPI direto no browser
  const fetchDollar = useCallback(async () => {
    try {
      setDollarLoading(true);
      const res = await fetch('/api/dollar');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const j = await res.json();
        if (j.data) {
          setDollar(j.data);
          return;
        }
      }

      // Fallback direto do navegador se o endpoint /api/dollar não responder JSON
      const fallbackRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
      if (fallbackRes.ok) {
        const j = await fallbackRes.json();
        if (j.USDBRL?.bid) {
          const num = parseFloat(j.USDBRL.bid);
          setDollar({
            rate: num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numericRate: num,
            source: 'AwesomeAPI (direto)',
            updatedAt: new Date().toISOString(),
            variation: (parseFloat(j.USDBRL.pctChange || '0')).toFixed(2) + '%',
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch dollar:', err);
    } finally {
      setDollarLoading(false);
    }
  }, []);

  // Fetch Weather com verificação de JSON
  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      const res = await fetch('/api/weather');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const j = await res.json();
        if (j.data && Array.isArray(j.data)) {
          setWeatherList(j.data);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch weather:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Fetch Flights & Detect Status Changes for Monitored Flights com verificação de JSON
  const fetchFlights = useCallback(async (fresh = false) => {
    try {
      setFlightsLoading(true);
      const url = `/api/flights${fresh ? '?fresh=true' : ''}`;
      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const j = await res.json();
        const incomingFlights: FlightItem[] = j.data || [];
        setFlights(incomingFlights);

        // Status change detection
        const updatedStatuses: { [id: string]: string } = { ...previousStatuses };
        const newAlerts: FlightStatusAlert[] = [];

        for (const f of incomingFlights) {
          const prev = previousStatuses[f.id];
          if (prev && prev !== f.status && monitoredFlightIds.includes(f.id)) {
            const alertItem: FlightStatusAlert = {
              id: `${f.id}_${Date.now()}`,
              flightId: f.id,
              flightNumber: f.flight,
              company: f.companyName,
              previousStatus: prev,
              newStatus: f.status,
              changeTime: formatLiveTime(),
              changeDate: formatLiveDate(),
              destination: f.destinationCity,
              gate: f.gate,
              unread: true,
            };

            newAlerts.push(alertItem);

            if (soundEnabled) {
              playAirportChime();
            }

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Voo ${f.companyName} ${f.flight} - Mudança de Status!`, {
                  body: `Novo status: ${f.status} (${f.gate}) às ${formatLiveTime()}`,
                  icon: f.companyLogoUrl || undefined,
                });
              } catch (e) {
                console.warn('Desktop notification error:', e);
              }
            }

            showToast(`Voo ${f.companyName} ${f.flight}: Mudança de status para "${f.status}" às ${formatLiveTime()}`);
          }

          updatedStatuses[f.id] = f.status;
        }

        if (newAlerts.length > 0) {
          setAlerts(prev => {
            const updated = [...newAlerts, ...prev];
            localStorage.setItem('bh_flight_alerts', JSON.stringify(updated));
            return updated;
          });
        }

        setPreviousStatuses(updatedStatuses);
        localStorage.setItem('bh_flight_statuses', JSON.stringify(updatedStatuses));
      }
    } catch (err) {
      console.warn('Failed to fetch flights:', err);
    } finally {
      setFlightsLoading(false);
    }
  }, [monitoredFlightIds, previousStatuses, soundEnabled, showToast]);

  // Initial load
  useEffect(() => {
    fetchDollar();
    fetchFlights();
    fetchWeather();
  }, [fetchDollar, fetchFlights, fetchWeather]);

  // Auto-refresh a cada 10 segundos com countdown visível
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshCountdown(prev => {
        if (prev <= 1) {
          fetchDollar();
          fetchFlights(true);
          fetchWeather();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchDollar, fetchFlights, fetchWeather]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    setAutoRefreshCountdown(10);
    fetchDollar();
    fetchFlights(true);
    fetchWeather();
    showToast('Atualizando dados dos voos, dólar e meteorologia...');
  };

  // Toggle flight notification
  const handleToggleNotify = (flight: FlightItem) => {
    const isCurrentlyMonitored = monitoredFlightIds.includes(flight.id);
    let updated: string[];

    if (isCurrentlyMonitored) {
      updated = monitoredFlightIds.filter(id => id !== flight.id);
      showToast(`Notificações desativadas para o voo ${flight.companyName} ${flight.flight}.`);
    } else {
      updated = [...monitoredFlightIds, flight.id];
      showToast(`🔔 Notificações ativadas para o voo ${flight.companyName} ${flight.flight}! Você será avisado quando o status mudar.`);
      
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(p => setBrowserPermission(p));
      }

      setPreviousStatuses(prev => {
        const next = { ...prev, [flight.id]: flight.status };
        localStorage.setItem('bh_flight_statuses', JSON.stringify(next));
        return next;
      });
    }

    setMonitoredFlightIds(updated);
    localStorage.setItem('bh_monitored_flights', JSON.stringify(updated));
  };

  const handleRemoveMonitored = (flightId: string) => {
    const updated = monitoredFlightIds.filter(id => id !== flightId);
    setMonitoredFlightIds(updated);
    localStorage.setItem('bh_monitored_flights', JSON.stringify(updated));
  };

  const handleClearAlerts = () => {
    setAlerts([]);
    localStorage.removeItem('bh_flight_alerts');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('bh_sound_enabled', String(next));
    if (next) {
      playAirportChime();
      showToast('Sons de alerta ativados.');
    } else {
      showToast('Sons de alerta desativados.');
    }
  };

  const handleSimulateAlert = () => {
    const targetFlight = flights[0] || {
      id: 'test_2023',
      flight: '2023',
      companyName: 'GOL',
      destinationCity: 'Rio de Janeiro - Galeão (GIG)',
      gate: 'Portão 28',
      status: 'Embarque Próximo',
    };

    const simulatedAlert: FlightStatusAlert = {
      id: `sim_${Date.now()}`,
      flightId: targetFlight.id,
      flightNumber: targetFlight.flight,
      company: targetFlight.companyName,
      previousStatus: 'Previsto',
      newStatus: 'Embarque Próximo',
      changeTime: formatLiveTime(),
      changeDate: formatLiveDate(),
      destination: targetFlight.destinationCity,
      gate: targetFlight.gate,
      unread: true,
    };

    if (soundEnabled) {
      playAirportChime();
    }

    setAlerts(prev => {
      const updated = [simulatedAlert, ...prev];
      localStorage.setItem('bh_flight_alerts', JSON.stringify(updated));
      return updated;
    });

    showToast(`[TESTE] Voo ${targetFlight.companyName} ${targetFlight.flight}: Novo status: Embarque Próximo às ${formatLiveTime()}`);
  };

  // Available airlines
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    flights.forEach(f => {
      if (f.companyName) set.add(f.companyName);
    });
    return Array.from(set).sort();
  }, [flights]);

  // Lista de Voos da aba RIO: apenas Galeão e Santos Dumont, sem aeronaves decoladas
  const rioFlights = useMemo(() => {
    return flights.filter(f => {
      // Somente voos para GIG ou SDU
      if (f.destinationCode !== 'GIG' && f.destinationCode !== 'SDU') {
        return false;
      }

      // Remove voos já decolados
      if (!isFlightNotDeparted(f, currentTimeMs)) {
        return false;
      }

      // Filtro de aeroporto selecionado (TODOS RIO, GIG, SDU)
      if (selectedAirport === 'GIG' && f.destinationCode !== 'GIG') {
        return false;
      }
      if (selectedAirport === 'SDU' && f.destinationCode !== 'SDU') {
        return false;
      }

      // Filtro de cia aérea
      if (selectedAirline !== 'ALL' && f.companyName !== selectedAirline) {
        return false;
      }

      // Filtro das próximas 12 horas
      if (showNext12HoursOnly && f.departureTimestamp > currentTimeMs + 12 * 60 * 60 * 1000) {
        return false;
      }

      return true;
    });
  }, [flights, selectedAirport, selectedAirline, showNext12HoursOnly, currentTimeMs]);

  // Lista de Voos da aba TODOS: todo o painel de decolagens, sem voos já decolados
  const allDepartures = useMemo(() => {
    return flights.filter(f => {
      // Remove voos já decolados
      if (!isFlightNotDeparted(f, currentTimeMs)) {
        return false;
      }

      // Filtro de cia aérea
      if (selectedAirline !== 'ALL' && f.companyName !== selectedAirline) {
        return false;
      }

      // Filtro das próximas 12 horas
      if (showNext12HoursOnly && f.departureTimestamp > currentTimeMs + 12 * 60 * 60 * 1000) {
        return false;
      }

      return true;
    });
  }, [flights, selectedAirline, showNext12HoursOnly, currentTimeMs]);

  const activeFlightsList = mainTab === 'RIO' ? rioFlights : allDepartures;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Header em uma linha única: Hora, Dólar (2 decimais), Botão Atualizar (10s countdown) e Links */}
      <Header
        currentTime={currentTime}
        dollar={dollar}
        dollarLoading={dollarLoading}
        flightsLoading={flightsLoading}
        onRefresh={handleManualRefresh}
        autoRefreshCountdown={autoRefreshCountdown}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="bg-sky-900 text-white px-3 py-2 rounded-xl shadow-md text-xs font-medium flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-sky-300 animate-pulse shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-sky-300 hover:text-white text-xs underline cursor-pointer shrink-0"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Segunda Linha da Página: Abas RIO/TODOS à esquerda, e à direita: CNF-RIO + botões PASSE AZUL e PASSE GOL */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
          <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => {
                setMainTab('RIO');
                setSelectedAirport('ALL');
                setSelectedAirline('ALL');
              }}
              className={`px-3 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                mainTab === 'RIO'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RIO
            </button>

            <button
              type="button"
              onClick={() => {
                setMainTab('TODOS');
                setSelectedAirline('ALL');
              }}
              className={`px-3 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                mainTab === 'TODOS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TODOS
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-black text-slate-700 font-mono tracking-tight mr-0.5">
              CNF-RIO
            </span>

            <a
              href="https://passelivre.voeazul.com.br/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md text-white bg-[#002f6c] hover:bg-[#00214c] transition-all shadow-xs shrink-0 cursor-pointer"
              title="Acessar Passe Livre Azul"
            >
              <span>PASSE AZUL</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>

            <a
              href="https://passelivre.voegol.com.br/Login.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md text-white bg-[#ff5a00] hover:bg-[#e04f00] transition-all shadow-xs shrink-0 cursor-pointer"
              title="Acessar Passe Livre GOL"
            >
              <span>PASSE GOL</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-80" />
            </a>
          </div>
        </div>

        {/* Painel Principal de Voos */}
        <div className="space-y-2.5">
          {/* Barra de Filtros: na aba RIO tem TODOS RIO, GIG, SDU e CIA na mesma linha; na aba TODOS tem CIA */}
          {mainTab === 'RIO' ? (
            <FlightFilters
              selectedAirport={selectedAirport}
              onSelectAirport={setSelectedAirport}
              selectedAirline={selectedAirline}
              onSelectAirline={setSelectedAirline}
              availableAirlines={availableAirlines}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Todas as Decolagens (ordem por horário)
              </span>

              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 font-bold">CIA:</span>
                <select
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 cursor-pointer"
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
          )}

          {/* Tabela de Voos */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header da Lista de Voos: frase 'mais cedo no topo' removida */}
            <div className="px-3 sm:px-4 py-2 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-800">
                  Partidas ordenadas por horário
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNotificationsModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
                    monitoredFlightIds.length > 0
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Abrir Central de Notificações de Voos"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Notificações</span>
                  {monitoredFlightIds.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {monitoredFlightIds.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Cabeçalho de colunas alinhadas verticalmente para a aba TODOS */}
            {mainTab === 'TODOS' && activeFlightsList.length > 0 && (
              <div className="px-2 sm:px-3 py-1 bg-slate-100/90 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="w-14 sm:w-16 shrink-0">Hora</div>
                  <div className="w-18 sm:w-20 shrink-0">Voo</div>
                  <div className="w-36 sm:w-52 md:w-64 shrink-0">Destino</div>
                  <div className="w-12 sm:w-14 shrink-0 text-center">Portão</div>
                  <div className="shrink-0">Status</div>
                </div>
                <div className="shrink-0 text-right pr-1">Avisos</div>
              </div>
            )}

            {/* Linhas de Voos */}
            {flightsLoading && flights.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <RefreshCw className="w-7 h-7 text-sky-500 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  Carregando voos em tempo real do BH Airport...
                </p>
              </div>
            ) : activeFlightsList.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  Nenhum voo previsto no momento com os filtros atuais.
                </p>
                {selectedAirline !== 'ALL' && (
                  <button
                    onClick={() => setSelectedAirline('ALL')}
                    className="mt-2.5 px-3 py-1 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer"
                  >
                    Mostrar todas as Cias
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {mainTab === 'RIO'
                  ? rioFlights.map((flight, idx) => (
                      <FlightRow
                        key={`rio-${flight.id}-${idx}`}
                        flight={flight}
                        currentTimeMs={currentTimeMs}
                        isNotified={monitoredFlightIds.includes(flight.id)}
                        onToggleNotify={handleToggleNotify}
                      />
                    ))
                  : allDepartures.map((flight, idx) => (
                      <AllFlightsRow
                        key={`all-${flight.id}-${idx}`}
                        flight={flight}
                        isNotified={monitoredFlightIds.includes(flight.id)}
                        onToggleNotify={handleToggleNotify}
                      />
                    ))}
              </div>
            )}

            {/* Rodapé da tabela: aviso das próximas 12hrs */}
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/80 text-center">
              <button
                type="button"
                onClick={() => setShowNext12HoursOnly(!showNext12HoursOnly)}
                className="text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                {showNext12HoursOnly ? (
                  <>
                    <span>Mostrando voos das próximas 12hrs.</span>
                    <span className="font-bold underline text-sky-800">(Clique para ver mais voos)</span>
                  </>
                ) : (
                  <>
                    <span>Exibindo todos os voos disponíveis.</span>
                    <span className="font-bold underline text-sky-800">(Clique para filtrar apenas próximas 12h)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Informações METAR dos Aeroportos (Confins, Galeão, Santos Dumont) posicionadas abaixo da lista de voos */}
        <WeatherBar
          weatherList={weatherList}
          loading={weatherLoading}
        />
      </main>

      {/* Footer simples e limpo */}
      <footer className="mt-6 border-t border-slate-200 bg-white py-3.5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Painel de Partidas Confins (CNF) · bh-airport.com.br</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://www.bh-airport.com.br/pt-BR"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-700 inline-flex items-center gap-1 transition-colors"
            >
              BH Airport <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>·</span>
            <a
              href="https://www.dolarhoje.net.br"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-700 inline-flex items-center gap-1 transition-colors"
            >
              Dólar Hoje <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span>·</span>
            <a
              href="https://aviationweather.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-700 inline-flex items-center gap-1 transition-colors"
            >
              METAR NOAA <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modal de Notificações de Voos */}
      <NotificationsModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        monitoredFlightIds={monitoredFlightIds}
        flights={flights}
        alerts={alerts}
        onRemoveMonitored={handleRemoveMonitored}
        onClearAlerts={handleClearAlerts}
        onSimulateAlert={handleSimulateAlert}
        browserPermission={browserPermission}
        onRequestPermission={handleRequestPermission}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
