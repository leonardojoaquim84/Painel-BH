export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://www.bh-airport.com.br/api/flights?type=departure', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://www.bh-airport.com.br/pt-BR/find-your-flight',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`BH Airport API status: ${response.status}`);
    }

    const rawList: any[] = await response.json();
    if (!Array.isArray(rawList)) {
      throw new Error('Response is not an array');
    }

    const processed: any[] = [];

    for (const item of rawList) {
      const destinationStr = (item.destination || '').trim();
      const destLower = destinationStr.toLowerCase();

      let destCode = 'OTHER';
      let destCity = destinationStr || 'Outro Destino';

      if (destLower.includes('gale') || destLower.includes('gig') || destLower.includes('antonio carlos jobim')) {
        destCode = 'GIG';
        destCity = 'Rio de Janeiro - Galeão (GIG)';
      } else if (destLower.includes('santos') || destLower.includes('sdu') || destLower.includes('dumont')) {
        destCode = 'SDU';
        destCity = 'Rio de Janeiro - Santos Dumont (SDU)';
      } else if (destLower.includes('rio de janeiro')) {
        destCode = 'GIG';
        destCity = destinationStr;
      }

      let depTime = 0;
      if (item.scheduledUnformated) {
        depTime = new Date(item.scheduledUnformated).getTime();
      }
      if (!depTime && item.scheduled) {
        const [h, m] = item.scheduled.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        depTime = d.getTime();
      }

      const compClean = (item.companyName || item.company?.name || 'CIA').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const flightNum = String(item.flight || item.id || 'VOO').replace(/[^A-Z0-9]/g, '');
      const isoTime = item.scheduledUnformated || new Date(depTime).toISOString();
      const uniqueId = `${compClean}_${flightNum}_${isoTime}_${processed.length}`;

      const flightDateObj = new Date(depTime || Date.now());
      const flightDateISO = flightDateObj.toISOString().split('T')[0];
      const nowBrazilStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

      let dateLabel = 'Hoje';
      if (flightDateISO !== nowBrazilStr) {
        const todayMidnight = new Date(nowBrazilStr + 'T00:00:00Z').getTime();
        const flightMidnight = new Date(flightDateISO + 'T00:00:00Z').getTime();
        const diffDays = Math.round((flightMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          dateLabel = 'Amanhã';
        } else {
          const parts = flightDateISO.split('-');
          dateLabel = `${parts[2]}/${parts[1]}`;
        }
      }

      processed.push({
        id: uniqueId,
        companyName: (item.companyName || item.company?.name || 'Companhia Aérea').toUpperCase(),
        companyLogoUrl: item.company?.image?.url || '',
        flight: String(item.flight || ''),
        status: (item.status || 'Previsto').trim(),
        destination: destinationStr,
        destinationCode: destCode,
        destinationCity: destCity,
        scheduled: item.scheduled || '--:--',
        estimated: item.estimated || item.scheduled || '--:--',
        scheduledUnformated: item.scheduledUnformated || new Date(depTime).toISOString(),
        departureTimestamp: depTime,
        gate: item.gate ? `Portão ${item.gate}` : 'Aguardando',
        terminal: item.terminal || 'Terminal 1',
        flightDate: flightDateISO,
        dateLabel,
      });
    }

    processed.sort((a, b) => a.departureTimestamp - b.departureTimestamp);

    return res.status(200).json({
      success: true,
      count: processed.length,
      data: processed,
      source: 'bh-airport.com.br',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
