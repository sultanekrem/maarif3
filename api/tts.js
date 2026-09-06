const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

function sanitizeForSpeech(str, isEnglish) {
  if (isEnglish) {
    return String(str || '')
      .replace(/&/g, ' and ')
      // Strip Turkish words in parentheses, e.g. (sınıf arkadaşım), (kitaplıklar), (güneşli)
      .replace(/\([^\)]*\)/g, '')
      // Replace fill-in-the-blank dots with a natural pause
      .replace(/[._]{2,}/g, ', ')
      // Strip dialogue dash / hyphen (never read as minus or dash)
      .replace(/\s*-\s*/g, ', ')
      .replace(/['"“”‘’]/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return String(str || '')
    .replace(/&/g, ' ve ')
    .replace(/</g, ' küçüktür ')
    .replace(/>/g, ' büyüktür ')
    .replace(/['"“”‘’]/g, '')
    // Math operations: only turn + and - into 'artı' / 'eksi' when between numbers
    .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 artı $2')
    .replace(/\+/g, ' artı ')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 eksi $2')
    // Any remaining standalone dashes (dialogues, quotes, titles) become a natural pause comma
    .replace(/\s*-\s*/g, ', ')
    .replace(/×|\*/g, ' çarpı ')
    .replace(/÷|\//g, ' bölü ')
    .replace(/=/g, ' eşittir ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // Voice selection:
  // - Jenny: en-US-JennyNeural (Authentic, clear native English female voice)
  // - Ahmet: tr-TR-AhmetNeural
  // - Emel: tr-TR-EmelNeural (Default warm Turkish teacher voice)
  let voice = 'tr-TR-EmelNeural';
  let isEnglish = false;
  const reqVoice = (req.query && req.query.voice) ? String(req.query.voice).toLowerCase() : '';
  if (reqVoice.includes('jenny') || reqVoice === 'en' || reqVoice === 'english' || reqVoice.startsWith('en-')) {
    voice = 'en-US-JennyNeural';
    isEnglish = true;
  } else if (reqVoice === 'ahmet') {
    voice = 'tr-TR-AhmetNeural';
  }

  // Rate: -8% provides a calm, gentle, pedagogical tempo for 3rd graders
  let rate = '-8%';
  if (req.query && req.query.rate) {
    rate = String(req.query.rate);
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const safeText = sanitizeForSpeech(text, isEnglish).substring(0, 1000);
    const { audioStream } = tts.toStream(safeText, { rate });

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
