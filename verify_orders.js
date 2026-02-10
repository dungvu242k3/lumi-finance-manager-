const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envFile.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error("Could not read .env file:", e.message);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env");
    process.exit(1);
}

// Extract hostname from URL
const hostname = SUPABASE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

const options = {
    hostname: hostname,
    path: '/rest/v1/orders?select=id,order_code,delivery_staff&limit=10&order=created_at.desc.nullslast',
    method: 'GET',
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

console.log("Starting request...");

const req = https.request(options, (res) => {
    console.log(`Connected! STATUS: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        console.log("Received chunk...");
        data += chunk;
    });

    res.on('end', () => {
        console.log("Response ended.");
        try {
            const json = JSON.parse(data);
            console.log("Records found:", json.length);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("Raw Data:", data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.end();

req.on('timeout', () => {
    req.destroy();
    console.error('Request timed out');
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
