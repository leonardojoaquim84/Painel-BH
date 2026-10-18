export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawQuery = (req.query?.icao || req.query?.code || req.query?.q || '') as string;
  const clean = rawQuery.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (!clean) {
    return res.status(400).json({ success: false, error: 'Código de aeroporto obrigatório' });
  }

  const IATA_MAP: Record<string, string> = {
    GRU: 'SBGR', CGH: 'SBSP', BSB: 'SBBR', CNF: 'SBCF', GIG: 'SBGL', SDU: 'SBRJ',
    VCP: 'SBKP', POA: 'SBPA', CWB: 'SBCT', SSA: 'SBSV', REC: 'SBRF', FOR: 'SBFZ',
    BEL: 'SBBE', MAO: 'SBEG', FLN: 'SBFL', VIX: 'SBVT', NAT: 'SBSG', MCZ: 'SBMO',
    JPA: 'SBJP', AJU: 'SBAR', SLZ: 'SBSL', CGB: 'SBCY', GYN: 'SBGO', BPS: 'SBPB',
    UDI: 'SBUL', NVT: 'SBNF', RAO: 'SBRP', IGU: 'SBFI', JDO: 'SBJU', IOS: 'SBIL',
    MOC: 'SBMK', MGF: 'SBMG', LDB: 'SBLO', XAP: 'SBCH', CXJ: 'SBCX', PET: 'SBPK',
    JOI: 'SBJV', PMW: 'SBPW', PVH: 'SBPV', RBR: 'SBRB', BVB: 'SBBV', MCP: 'SBMQ',
    THE: 'SBTE', IMP: 'SBIZ', PNZ: 'SBPL', CPV: 'SBKG', CPQ: 'SBKP', PLU: 'SBBH',
    JFK: 'KJFK', MIA: 'KMIA', MCO: 'KMCO', LAX: 'KLAX', ORD: 'KORD', ATL: 'KATL',
    EWR: 'KEWR', BOS: 'KBOS', SFO: 'KSFO', IAD: 'KIAD', DFW: 'KDFW', IAH: 'KIAH',
    LIS: 'LPPT', OPO: 'LPPR', MAD: 'LEMD', CDG: 'LFPG', ORY: 'LFPO', LHR: 'EGLL',
    EZE: 'SAEZ', AEP: 'SABE', SCL: 'SCEL', MVD: 'SUMU', BOG: 'SKBO', LIM: 'SPJC',
  };

  const codesToTry: string[] = [];
  if (clean.length === 4) {
    codesToTry.push(clean);
  } else if (clean.length === 3) {
    if (IATA_MAP[clean]) codesToTry.push(IATA_MAP[clean]);
    codesToTry.push(`SB${clean}`);
    codesToTry.push(`K${clean}`);
    codesToTry.push(clean);
  } else {
    codesToTry.push(clean);
  }

  const uniqueCodes = Array.from(new Set(codesToTry));
  const queryParam = uniqueCodes.join(',');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const apiRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${queryParam}&format=json`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const rawMetar = item.rawOb || `METAR ${item.icaoId}`;
        const fltCat = (item.fltCat || (rawMetar.includes('BKN01') || rawMetar.includes('OVC01') ? 'MVFR' : 'VFR')).toUpperCase();
        return res.json({
          success: true,
          data: {
            icao: item.icaoId || uniqueCodes[0],
            name: item.name || item.icaoId,
            metar: rawMetar,
            fltCat,
            temperature: typeof item.temp === 'number' ? item.temp : undefined,
            windSpeed: typeof item.wspd === 'number' ? Math.round(item.wspd * 1.852) : undefined,
            windDir: item.wdir,
            altimeter: item.altim,
          },
        });
      }
    }
  } catch (e) {
    console.warn(`Error querying aviationweather.gov for ${clean}:`, e);
  }

  // Fallback raw text
  for (const c of uniqueCodes) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const rawRes = await fetch(`https://aviationweather.gov/api/data/metar?ids=${c}&format=raw`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (rawRes.ok) {
        const text = await rawRes.text();
        const trimmed = text.trim();
        if (trimmed && (trimmed.includes(c) || trimmed.startsWith('METAR'))) {
          let fltCat = 'VFR';
          if (trimmed.includes('OVC00') || trimmed.includes('BKN00')) fltCat = 'IFR';
          else if (trimmed.includes('BKN01') || trimmed.includes('OVC01')) fltCat = 'MVFR';
          return res.json({
            success: true,
            data: {
              icao: c,
              name: c,
              metar: trimmed.startsWith('METAR') ? trimmed : `METAR ${trimmed}`,
              fltCat,
            },
          });
        }
      }
    } catch {}
  }

  return res.status(404).json({
    success: false,
    error: `METAR não encontrado para o aeroporto ${clean}.`,
  });
}
