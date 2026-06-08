const http = require('http');

async function doFetch(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:3000${path}`, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function test() {
    console.log("Testing Login...");
    try {
        const body = JSON.stringify({ countryCode: 'RU +7', phone: '7001234567', password: 'password123' });
        const res = await doFetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            body: body
        });
        console.log("Response status:", res.status);
        console.log("Response body:", res.data);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}
test();
