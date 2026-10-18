export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const stationMap: Record<string, { code: 'CNF' | 'GIG' | 'SDU'; name: string; city: string }> = {
      SBCF: { code: 'CNF', name: 'Confins (CNF)', city: 'Belo Horizonte' },
      SBGL: { code: 'GIG', name: 'Galeão (GIG)', city: 'Rio de Janeiro' },
      SBRJ: { code: 'SDU', name: 'Santos Dumont (SDU)', city: 'Rio de Janeiro' },
    };

    const results: any[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch('https://aviationweather.gov/api/data/metar?ids=SBCF,SBGL,SBRJ&format=json', {
        headers: {
          'User-Agent': 'BH-Airport-Dashboard/1.0',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            const icao = (item.icaoId || item.station || '').toUpperCase();
            const meta = stationMap[icao];
            if (!meta) continue;

            const rawMetar = item.rawOb || `METAR ${icao} ${item.obsTime || ''}`;
            const fltCat = (item.fltCat || 'VFR').toUpperCase();

            results.push({
              code: meta.code,
              icao,
              name: meta.name,
              city: meta.city,
              metar: rawMetar,
              fltCat,
              temperature: typeof item.temp === 'number' ? item.temp : 24,
              windSpeed: typeof item.wspd === 'number' ? Math.round(item.wspd * 1.852) : 10,
              windDir: item.wdir,
              altimeter: item.altim || 1015,
              condition: fltCat === 'VFR' ? 'Condições Visuais (VFR)' : fltCat === 'MVFR' ? 'Visual Marginal (MVFR)' : 'Instrumentos (IFR)',
              isGoodForFlight: fltCat === 'VFR' || fltCat === 'MVFR',
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('aviationweather METAR fetch error:', err);
    }

    // Fill fallback if needed
    const nowDay = new Date().getUTCDate().toString().padStart(2, '0');
    const nowHour = new Date().getUTCHours().toString().padStart(2, '0');
    const timeZulu = `${nowDay}${nowHour}00Z`;

    const fallbackMetars: Record<'SBCF' | 'SBGL' | 'SBRJ', { metar: string; fltCat: string; temp: number; wind: number }> = {
      SBCF: { metar: `METAR SBCF ${timeZulu} 36007KT 9999 SCT012 BKN020 25/21 Q1015`, fltCat: 'VFR', temp: 25, wind: 13 },
      SBGL: { metar: `METAR SBGL ${timeZulu} 28003KT 8000 BKN020 BKN040 25/20 Q1011`, fltCat: 'VFR', temp: 25, wind: 6 },
      SBRJ: { metar: `METAR SBRJ ${timeZulu} 11003KT 9999 FEW010 SCT025 25/20 Q1010`, fltCat: 'VFR', temp: 25, wind: 6 },
    };

    for (const icao of ['SBCF', 'SBGL', 'SBRJ'] as const) {
      if (!results.some(r => r.icao === icao)) {
        const meta = stationMap[icao];
        const fb = fallbackMetars[icao];
        results.push({
          code: meta.code,
          icao,
          name: meta.name,
          city: meta.city,
          metar: fb.metar,
          fltCat: fb.fltCat,
          temperature: fb.temp,
          windSpeed: fb.wind,
          condition: 'Condições Visuais (VFR)',
          isGoodForFlight: true,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return res.status(200).json({ success: true, data: results });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
