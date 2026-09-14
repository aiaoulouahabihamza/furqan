import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  // Allow rendering in Google AI Studio iframe preview
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.removeHeader('X-Frame-Options');
  next();
});

// Security helpers: SSRF protection and filename sanitization
function isSafeUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

function sanitizeFilename(name) {
  if (!name || typeof name !== 'string') return 'download';
  return name.replace(/[\/\\?%*:|"<>]/g, '_').trim().slice(0, 100);
}

// Endpoint for direct downloads (audio and pdf) with forced headers
app.get('/furqan-project.zip', (req, res) => {
  const zipPath = path.join(__dirname, 'furqan-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="furqan-project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    return res.sendFile(zipPath);
  }
  res.status(404).send('Archive not found');
});

app.get('/api/download-project', (req, res) => {
  const zipPath = path.join(__dirname, 'furqan-project.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="furqan-project.zip"');
    res.setHeader('Content-Type', 'application/zip');
    return res.sendFile(zipPath);
  }
  res.status(404).send('Archive not found');
});

// Endpoint for direct downloads (audio and pdf) with forced headers
app.get('/api/download-file', async (req, res) => {
  const fileUrl = req.query.url;
  const rawFilename = req.query.filename || 'download';
  
  if (!fileUrl) {
    return res.status(400).send('Missing file URL');
  }

  // Handle case if client passed a relative proxy url
  let actualUrl = fileUrl;
  if (fileUrl.startsWith('/api/download-file?') || fileUrl.includes('/api/download-file?url=')) {
    try {
      const match = fileUrl.match(/[?&]url=([^&]+)/);
      if (match) actualUrl = decodeURIComponent(match[1]);
    } catch (e) {}
  }

  if (!isSafeUrl(actualUrl)) {
    return res.status(403).send('Invalid or restricted file URL');
  }
  
  const filename = sanitizeFilename(rawFilename);
  const cleanUrl = actualUrl.replace(/^http:\/\//i, 'https://');
  
  try {
    let referer = 'https://islamhouse.com/';
    try {
      const parsed = new URL(cleanUrl);
      referer = `${parsed.protocol}//${parsed.hostname}/`;
    } catch(e) {}

    const response = await fetch(cleanUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
    }
    
    // Set response headers to force download and set correct content type
    const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
    
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).send('Error downloading file');
  }
});

// Audio streaming proxy for audio files that may fail CORS or mixed content
app.get('/api/proxy-audio', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('Missing audio URL');
  
  let actualUrl = fileUrl;
  if (fileUrl.startsWith('/api/proxy-audio?') || fileUrl.includes('/api/proxy-audio?url=')) {
    try {
      const match = fileUrl.match(/[?&]url=([^&]+)/);
      if (match) actualUrl = decodeURIComponent(match[1]);
    } catch (e) {}
  }

  if (!isSafeUrl(actualUrl)) {
    return res.status(403).send('Invalid or restricted audio URL');
  }

  const cleanUrl = actualUrl.replace(/^http:\/\//i, 'https://');
  try {
    let referer = 'https://islamhouse.com/';
    try {
      const parsed = new URL(cleanUrl);
      referer = `${parsed.protocol}//${parsed.hostname}/`;
    } catch(e) {}

    const range = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': referer,
      'Accept': '*/*'
    };
    if (range) {
      fetchHeaders['Range'] = range;
    }
    const response = await fetch(cleanUrl, { 
      redirect: 'follow',
      headers: fetchHeaders 
    });
    res.status(response.status);
    ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach(h => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).send('Error proxying audio');
  }
});

// Proxy for IslamHouse single item
app.get('/api/islamhouse-item', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing item id' });
  try {
    const response = await fetch(`https://api3.islamhouse.com/v3/paV29H2gm56kvLPy/main/get-item/${id}/ar/json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://islamhouse.com/'
      }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch item' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Islamhouse item fetch error' });
  }
});

app.use(express.json());

// Explicit handler for ayat&ebra.json to handle url-encoded ampersand and aliasing
app.get(['/data/json/ayat&ebra.json', '/data/json/ayat%26ebra.json', '/data/json/ayat_ebra.json'], (req, res) => {
  const primaryPath = path.join(__dirname, 'data', 'json', 'ayat&ebra.json');
  const aliasPath = path.join(__dirname, 'data', 'json', 'ayat_ebra.json');
  if (fs.existsSync(primaryPath)) {
    return res.sendFile(primaryPath);
  } else if (fs.existsSync(aliasPath)) {
    return res.sendFile(aliasPath);
  }
  res.status(404).json({ error: 'File not found' });
});

// Explicit handler for 100dua.json & aliases
app.get(['/data/json/100dua.json', '/data/json/duas.json', '/data/json/dua.json'], (req, res) => {
  const filePath = path.join(__dirname, 'data', 'json', '100dua.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).json({ error: 'File not found' });
});

// Explicit handler for surah.json & aliases
app.get(['/data/json/surah.json', '/data/json/surahs.json'], (req, res) => {
  const filePath = path.join(__dirname, 'data', 'json', 'surah.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.status(404).json({ error: 'File not found' });
});

// Serve all static files from project root with smart cache control
app.use(express.static(__dirname, { 
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        const lowerPath = filePath.toLowerCase();
        if (lowerPath.endsWith('.html') || lowerPath.endsWith('.js') || lowerPath.endsWith('.css') || lowerPath.endsWith('.json')) {
            // Always validate code and markup changes with the server before using cache
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            // Static media assets (images, audio, icons) can be cached for 1 hour
            res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        }
    }
}));

// Sub-section routes: redirect or serve subdirectory index.html directly
const sections = ['quran', 'prayer', 'adkar', 'sunah', 'recitations', 'tasbeeh', 'stories', 'settings', 'fatwas', 'library', 'lectures'];
sections.forEach(sec => {
  app.get([`/${sec}`, `/${sec}/`], (req, res) => {
    res.sendFile(path.join(__dirname, sec, 'index.html'));
  });
});

// Never return index.html for missing static files (scripts, styles, images, json)
app.get('*', (req, res) => {
  const hasFileExtension = /\.(js|json|css|png|jpg|jpeg|gif|svg|ico|mp3|wav|ogg|woff|woff2|ttf|eot|map)$/i.test(req.path);
  if (hasFileExtension) {
    return res.status(404).type('text/plain').send('404 Not Found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
