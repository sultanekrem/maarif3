const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Extract text parameter
  let text = '';
  if (req.query && req.query.text) {
    text = req.query.text;
  } else if (req.url) {
    try {
      const u = new URL(req.url, 'http://localhost');
      text = u.searchParams.get('text') || '';
    } catch (e) {}
  }

  text = String(text || '').trim();
  if (!text) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Metin (text) parametresi gereklidir.' }));
    return;
  }

  // Voice selection: default Emel (friendly, warm Turkish female teacher voice)
  const voice = (req.query && req.query.voice === 'ahmet') ? 'tr-TR-AhmetNeural' : 'tr-TR-EmelNeural';

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const safeText = text.substring(0, 1000);
    const { audioStream } = tts.toStream(safeText);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    // Cache on CDN for fast instant replay
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');

    audioStream.on('error', (err) => {
      console.error('Audio stream error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Ses akisi hatasi' }));
      }
    });

    audioStream.pipe(res);
  } catch (err) {
    console.error('Edge TTS Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Ses sentezleme basarisiz oldu.', details: err.message }));
    }
  }
};
