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
  RefreshCw
} from 'lucide-react';
import type { FlightItem, DollarQuote, AirportWeather, FlightStatusAlert, DestinationAirport } from './types.ts';
import { formatLiveTime, formatLiveDate } from './utils/time.ts';
import { playAirportChime } from './utils/audio.ts';
import { Header } from './components/Header.tsx';
import { WeatherBar } from './components/WeatherBar.tsx';
import { FlightFilters } from './components/FlightFilters.tsx';
import { FlightRow } from './components/FlightRow.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';

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
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [flightsSource, setFlightsSource] = useState<string>('bh-airport.com.br');

  // Weather state
  const [weatherList, setWeatherList] = useState<AirportWeather[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);

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

  // Filtering states: TODOS RIO, GIG, SDU e CIA
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
    }, 4500);
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

  // Check browser notification support
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          showToast('Permissão para notificações do navegador ativada com sucesso!');
        }
      } catch (err) {
        console.warn('Error requesting notification permission:', err);
      }
    }
  };

  // Fetch Dollar
  const fetchDollar = useCallback(async () => {
    try {
      setDollarLoading(true);
      const res = await fetch('/api/dollar');
      if (res.ok) {
        const j = await res.json();
        if (j.data) {
          setDollar(j.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch dollar:', err);
    } finally {
      setDollarLoading(false);
    }
  }, []);

  // Fetch Weather
  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      const res = await fetch('/api/weather');
      if (res.ok) {
        const j = await res.json();
        if (j.data) {
          setWeatherList(j.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch weather:', err);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Fetch Flights & Detect Status Changes for Monitored Flights
  const fetchFlights = useCallback(async (fresh = false) => {
    try {
      setFlightsLoading(true);
      const url = `/api/flights${fresh ? '?fresh=true' : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        const incomingFlights: FlightItem[] = j.data || [];
        setFlights(incomingFlights);
        setFlightsSource(j.source || 'bh-airport.com.br');
        setLastUpdatedTime(formatLiveTime());

        // Status change detection
        const updatedStatuses: { [id: string]: string } = { ...previousStatuses };
        const newAlerts: FlightStatusAlert[] = [];

        for (const f of incomingFlights) {
          const prev = previousStatuses[f.id];
          if (prev && prev !== f.status && monitoredFlightIds.includes(f.id)) {
            // Flight status changed!
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

            // Play chime
            if (soundEnabled) {
              playAirportChime();
            }

            // Desktop browser notification
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

            // In-app banner
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

    // Auto-refresh flights & dollar every 30 seconds
    const interval = setInterval(() => {
      fetchDollar();
      fetchFlights();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchDollar, fetchFlights, fetchWeather]);

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
      
      // If browser permission is default, ask for it nicely
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(p => setBrowserPermission(p));
      }

      // Record current status as baseline
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

  // Simulate alert test
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

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`[TESTE] Voo ${targetFlight.companyName} ${targetFlight.flight} - Mudança de Status!`, {
          body: `Novo status: Embarque Próximo (${targetFlight.gate}) às ${formatLiveTime()}`,
        });
      } catch (e) {
        console.warn(e);
      }
    }

    setAlerts(prev => {
      const updated = [simulatedAlert, ...prev];
      localStorage.setItem('bh_flight_alerts', JSON.stringify(updated));
      return updated;
    });

    showToast(`[TESTE] Voo ${targetFlight.companyName} ${targetFlight.flight}: Novo status: Embarque Próximo às ${formatLiveTime()}`);
  };

  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchDollar();
    fetchFlights(true);
    fetchWeather();
    showToast('Atualizando dados dos voos, dólar e meteorologia...');
  };

  // Available airlines for filter
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    flights.forEach(f => {
      if (f.companyName) set.add(f.companyName);
    });
    return Array.from(set).sort();
  }, [flights]);

  // Filtered flights
  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
      // Airport filter (ALL, GIG, SDU)
      if (selectedAirport !== 'ALL' && f.destinationCode !== selectedAirport) {
        return false;
      }

      // Airline filter
      if (selectedAirline !== 'ALL' && f.companyName !== selectedAirline) {
        return false;
      }

      // Next 12 hours filter
      if (showNext12HoursOnly && f.departureTimestamp > currentTimeMs + 12 * 60 * 60 * 1000) {
        return false;
      }

      return true;
    });
  }, [flights, selectedAirport, selectedAirline, showNext12HoursOnly, currentTimeMs]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-100 selection:text-sky-900">
      {/* Header com hora atual, cotação do dólar e botão de atualização */}
      <Header
        currentTime={currentTime}
        currentDate={currentDate}
        dollar={dollar}
        dollarLoading={dollarLoading}
        flightsLoading={flightsLoading}
        onRefresh={handleManualRefresh}
        lastUpdatedTime={lastUpdatedTime}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="bg-sky-900 text-white px-4 py-2.5 rounded-xl shadow-md text-xs sm:text-sm font-medium flex items-center justify-between gap-3 animate-fadeIn">
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

        {/* Painel Principal de Voos (posicionado no início, logo abaixo do cabeçalho) */}
        <div className="space-y-3">
          {/* Barra de Filtros: TODOS RIO, GIG, SDU, CIA na mesma linha */}
          <FlightFilters
            selectedAirport={selectedAirport}
            onSelectAirport={setSelectedAirport}
            selectedAirline={selectedAirline}
            onSelectAirline={setSelectedAirline}
            availableAirlines={availableAirlines}
          />

          {/* Tabela de Voos */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Header da Lista de Voos: sem exibir contagem de voos encontrados */}
            <div className="px-4 sm:px-6 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-800">
                  Partidas ordenadas por horário (mais cedo no topo)
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

            {/* Linhas de Voos */}
            {flightsLoading && flights.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  Carregando voos em tempo real de Confins para o Rio...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Consultando painel oficial de partidas do BH Airport (bh-airport.com.br)
                </p>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  Nenhum voo encontrado com os filtros atuais.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tente alterar os termos de busca ou desativar o filtro "Ocultar decolados".
                </p>
                {(searchQuery || selectedAirline !== 'ALL' || filterOnlyMonitored || hideDeparted) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedAirline('ALL');
                      setFilterOnlyMonitored(false);
                      setHideDeparted(false);
                      setSelectedAirport('ALL');
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFlights.map((flight, idx) => (
                  <FlightRow
                    key={`${flight.id}-${idx}`}
                    flight={flight}
                    currentTimeMs={currentTimeMs}
                    isNotified={monitoredFlightIds.includes(flight.id)}
                    onToggleNotify={handleToggleNotify}
                  />
                ))}
              </div>
            )}

            {/* Rodapé da tabela: aviso das próximas 12hrs */}
            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/80 text-center">
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
      <footer className="mt-8 border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span>Painel Confins (CNF) → Rio de Janeiro (Galeão GIG / Santos Dumont SDU)</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline text-slate-400">Atualizado com fontes públicas oficiais</span>
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
