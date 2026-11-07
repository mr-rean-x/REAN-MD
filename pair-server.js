/**
 * REAN MD — HTTP pair API (for the website on Vercel).
 *
 * The website (Vercel) calls THIS bot to get pairing codes, so a number
 * paired on the website links to THIS bot — exactly like Jawad MD's site.
 *
 *   POST /pair  { "number": "8801956501630" }  ->  { "code": "MRRE-ANMD" }
 *   GET  /                                  ->  { "ok": true }  (health check)
 *
 * Uses only Node's built-in http — no new dependencies.
 * Never crashes the bot: every error is caught and logged.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const startpairing = require('./pair');

const PAIRING_DIR = path.join(__dirname, 'kingbadboitimewisher', 'pairing');
const PAIRING_FILE = path.join(PAIRING_DIR, 'pairing.json');
const PORT = parseInt(process.env.PORT, 10) || 3000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One pairing per number at a time — a repeat request waits for the same code.
const pending = new Map();

function validNumber(text) {
    if (typeof text !== 'string') return false;
    if (/[a-z]/i.test(text)) return false;
    if (!/^\d{7,15}$/.test(text)) return false;
    if (text.startsWith('0')) return false;
    if (['252', '201'].includes(text.slice(0, 3))) return false;
    return true;
}

function pairedCount() {
    try {
        if (!fs.existsSync(PAIRING_DIR)) return 0;
        return fs.readdirSync(PAIRING_DIR).filter((f) => f.endsWith('@s.whatsapp.net')).length;
    } catch {
        return 0;
    }
}

function alreadyPaired(number) {
    try {
        const creds = JSON.parse(
            fs.readFileSync(path.join(PAIRING_DIR, number + '@s.whatsapp.net', 'creds.json'), 'utf8')
        );
        return !!(creds && creds.me && creds.me.id);
    } catch {
        return false;
    }
}

async function waitForCode(jid, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const data = JSON.parse(fs.readFileSync(PAIRING_FILE, 'utf8'));
            if (data && data.number === jid && data.code) {
                const age = Date.now() - new Date(data.timestamp).getTime();
                if (age < 60000) return data.code;
            }
        } catch {
            // pairing.json not written yet
        }
        await sleep(500);
    }
    return null;
}

async function requestCode(number) {
    const jid = number + '@s.whatsapp.net';
    if (pending.has(number)) return pending.get(number);
    const job = (async () => {
        await startpairing(jid);
        const code = await waitForCode(jid, 20000);
        if (!code) throw new Error('Pairing code not ready. Try again.');
        return code;
    })();
    pending.set(number, job);
    try {
        return await job;
    } finally {
        pending.delete(number);
    }
}

function sendJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 10000) req.destroy();
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

function start() {
    const server = http.createServer(async (req, res) => {
        try {
            if (req.method === 'OPTIONS') {
                res.writeHead(204, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                });
                return res.end();
            }
            if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
                return sendJson(res, 200, { ok: true, service: 'REAN MD pair server' });
            }
            if (req.method === 'POST' && req.url === '/pair') {
                const body = await readBody(req);
                const number = String(body.number || '').replace(/[^0-9]/g, '');
                if (!validNumber(number)) {
                    return sendJson(res, 400, { error: 'Enter a valid WhatsApp number with country code (example: 8801956501630).' });
                }
                if (alreadyPaired(number)) {
                    return sendJson(res, 400, { error: 'This number is already paired with REAN MD.' });
                }
                if (pairedCount() >= 1000) {
                    return sendJson(res, 429, { error: 'Pairing limit reached. Try again later.' });
                }
                const code = await requestCode(number);
                return sendJson(res, 200, { code });
            }
            return sendJson(res, 404, { error: 'Not found' });
        } catch (err) {
            console.error('[pair-server]', err.message);
            return sendJson(res, 500, { error: err.message || 'Pairing failed. Try again.' });
        }
    });
    server.on('error', (err) => {
        console.log('[pair-server] failed to start:', err.message);
    });
    server.listen(PORT, () => {
        console.log(`[pair-server] listening on port ${PORT} (POST /pair)`);
    });
    return server;
}

module.exports = { start };
