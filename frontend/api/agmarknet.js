// Vercel function in Mumbai (bom1): data.gov.in refuses connections from outside
// India, and the backend runs in Singapore. Forwards only to the Agmarknet
// mandi-price dataset, passing the caller's query (api-key, filters, paging).
const RESOURCE = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

export default async function handler(req, res) {
  const query = new URL(req.url, 'http://relay').searchParams.toString();
  try {
    const upstream = await fetch(`${RESOURCE}?${query}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'AgriYieldPro/1.0 (mandi relay)' },
    });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.send(await upstream.text());
  } catch (err) {
    res.status(502).json({ error: 'data.gov.in is not reachable', detail: String(err) });
  }
}
