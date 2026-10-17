export function formatLiveTime(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export function formatLiveDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

export interface CountdownInfo {
  text: string;
  subtext?: string;
  statusType: 'future' | 'imminent' | 'now' | 'departed' | 'delayed' | 'canceled';
  diffSeconds: number;
}

export function getFlightCountdown(
  departureTimestamp: number,
  statusStr: string,
  nowMs: number = Date.now()
): CountdownInfo {
  const normStatus = (statusStr || '').toLowerCase();

  // If status explicitly says departed
  if (normStatus.includes('decolou') || normStatus.includes('partiu')) {
    const diff = Math.floor((nowMs - departureTimestamp) / 1000);
    if (diff > 0 && diff < 86400) {
      const mins = Math.floor(diff / 60);
      if (mins < 60) {
        return {
          text: `Decolou há ${mins}m`,
          statusType: 'departed',
          diffSeconds: -diff,
        };
      }
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return {
        text: `Decolou há ${hrs}h${remMins ? ` ${remMins}m` : ''}`,
        statusType: 'departed',
        diffSeconds: -diff,
      };
    }
    return {
      text: 'Aeronave já decolou',
      statusType: 'departed',
      diffSeconds: -1,
    };
  }

  // If status is canceled
  if (normStatus.includes('cancelad')) {
    return {
      text: 'Cancelado',
      statusType: 'canceled',
      diffSeconds: 0,
    };
  }

  const diffMs = departureTimestamp - nowMs;
  const diffSec = Math.floor(diffMs / 1000);

  // If departure has passed by more than 15 minutes and not officially departed
  if (diffSec < -900) {
    const pastMins = Math.abs(Math.floor(diffSec / 60));
    return {
      text: `Partiu há ${pastMins}m`,
      statusType: 'departed',
      diffSeconds: diffSec,
    };
  }

  // If within -15 to 0 minutes, usually taxiing/takeoff
  if (diffSec <= 0) {
    return {
      text: 'Decolando agora',
      subtext: 'Pista de decolagem',
      statusType: 'now',
      diffSeconds: diffSec,
    };
  }

  // Imminent departure (under 25 minutes)
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (diffSec < 1500) {
    // Under 25 min: imminent
    return {
      text: `${pad(minutes)}m ${pad(seconds)}s`,
      subtext: 'Embarque final',
      statusType: 'imminent',
      diffSeconds: diffSec,
    };
  }

  if (hours > 0) {
    return {
      text: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
      subtext: 'Falta p/ decolar',
      statusType: 'future',
      diffSeconds: diffSec,
    };
  }

  return {
    text: `${pad(minutes)}m ${pad(seconds)}s`,
    subtext: 'Falta p/ decolar',
    statusType: 'future',
    diffSeconds: diffSec,
  };
}
