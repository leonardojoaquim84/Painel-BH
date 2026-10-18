export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let rate = '5,06';
    let numericRate = 5.06;
    let variation = '0,00%';
    let source = 'https://www.dolarhoje.net.br';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://dolarhoje.net.br', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const tableMatch = html.match(/Dólar Americano<\/a><\/td>\s*<td>USD<\/td>\s*<td>R\$\s*([\d,.]+)/i);
        const inputMatch = html.match(/id=["']nacional["'][^>]*value=["']([^"']+)["']/i);
        const boldMatch = html.match(/R\$\s*([\d,.]+)/);
        const found = tableMatch?.[1] || inputMatch?.[1] || boldMatch?.[1];

        if (found) {
          const rawNum = parseFloat(found.trim().replace(/\./g, '').replace(',', '.'));
          if (!isNaN(rawNum) && rawNum > 0) {
            numericRate = rawNum;
            rate = rawNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
        }

        const varMatch = html.match(/Dólar Americano[\s\S]*?<span[^>]*>([+-]?[\d,.]+%?)<\/span>/i);
        if (varMatch?.[1]) {
          variation = varMatch[1].trim();
        }
      }
    } catch {
      // Fallback to awesomeapi
      try {
        const fallbackRes = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
        if (fallbackRes.ok) {
          const j = await fallbackRes.json();
          if (j.USDBRL?.bid) {
            numericRate = parseFloat(j.USDBRL.bid);
            rate = numericRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            variation = (parseFloat(j.USDBRL.pctChange || '0')).toFixed(2) + '%';
            source = 'awesomeapi (backup para dolarhoje.net.br)';
          }
        }
      } catch {}
    }

    return res.status(200).json({
      success: true,
      data: {
        rate,
        numericRate,
        source,
        updatedAt: new Date().toISOString(),
        variation,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
