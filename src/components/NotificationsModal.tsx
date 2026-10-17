import React from 'react';
import { 
  X, 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  ExternalLink 
} from 'lucide-react';
import type { FlightItem, FlightStatusAlert } from '../types.ts';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  monitoredFlightIds: string[];
  flights: FlightItem[];
  alerts: FlightStatusAlert[];
  onRemoveMonitored: (flightId: string) => void;
  onClearAlerts: () => void;
  onSimulateAlert: () => void;
  browserPermission: NotificationPermission | 'unsupported';
  onRequestPermission: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  monitoredFlightIds,
  flights,
  alerts,
  onRemoveMonitored,
  onClearAlerts,
  onSimulateAlert,
  browserPermission,
  onRequestPermission,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  const monitoredFlightsList = flights.filter(f => monitoredFlightIds.includes(f.id));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="bg-white rounded-2xl shadow-xl border border-slate-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Central de Notificações de Voos
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe mudanças de status, portões e alertas em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Controls Bar: Permissão & Som */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Notificações no Navegador:</span>
              {browserPermission === 'granted' ? (
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativas
                </span>
              ) : (
                <button
                  onClick={onRequestPermission}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md transition-colors cursor-pointer"
                >
                  Ativar Permissão
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onToggleSound}
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
                title="Ativar ou desativar som de aviso sonoro"
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-600" />
                    <span>Som ativado</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4 text-slate-400" />
                    <span>Som mudo</span>
                  </>
                )}
              </button>

              <button
                onClick={onSimulateAlert}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-medium rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
                title="Testa um alerta simulando mudança de status de voo"
              >
                <Play className="w-3 h-3 text-amber-700" />
                <span>Testar Alerta</span>
              </button>
            </div>
          </div>

          {/* Voos Monitorados Atualmente */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Voos Selecionados para Alertas ({monitoredFlightsList.length})
              </h4>
            </div>

            {monitoredFlightsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p>Nenhum voo selecionado ainda.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Clique no ícone de sino (🔔) ao lado de qualquer voo na lista para ser avisado quando o status mudar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {monitoredFlightsList.map((f, idx) => (
                  <div key={`${f.id}-${idx}`} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-900 font-mono">
                        {f.companyName} {f.flight}
                      </div>
                      <div className="text-slate-500">
                        Partida: <span className="font-semibold text-slate-700">{f.scheduled}</span>
                      </div>
                      <div className="text-slate-500 hidden sm:inline">
                        Destino: <span className="font-medium text-slate-700">{f.destinationCode}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                        {f.status}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveMonitored(f.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Deixar de monitorar este voo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Alertas Recentes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Histórico de Notificações Recebidas ({alerts.length})
              </h4>
              {alerts.length > 0 && (
                <button
                  onClick={onClearAlerts}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Limpar histórico
                </button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center text-xs text-slate-400">
                Ainda não houve alterações de status nos voos monitorados nesta sessão.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {alerts.map((al, idx) => (
                  <div
                    key={`${al.id}-${idx}`}
                    className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/60 text-xs text-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-900 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 inline" />
                        Voo {al.flightNumber} ({al.company})
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {al.changeTime} ({al.changeDate})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-700">
                      <span>Status anterior: <del className="text-slate-400">{al.previousStatus}</del></span>
                      <span aria-hidden="true" className="text-slate-300">→</span>
                      <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                        Novo Status: {al.newStatus}
                      </span>
                      {al.gate && (
                        <span className="text-slate-500">· {al.gate}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>O painel verifica periodicamente o status oficial do BH Airport.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
