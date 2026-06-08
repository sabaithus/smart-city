const http = require('http');

async function doFetch(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:3000${path}`, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function runTest() {
    try {
        console.log('1. Registering User...');
        const regData = JSON.stringify({ name: 'Test Crisis User', countryCode: '+7', phone: '7009998888', password: 'password123', role: 'user' });
        let regRes = await doFetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': regData.length },
            body: regData
        });
        
        let cookie = '';
        if (regRes.status === 201) {
            cookie = regRes.headers['set-cookie'] ? regRes.headers['set-cookie'][0].split(';')[0] : '';
        } else {
            console.log('User might exist, trying login...');
            const loginData = JSON.stringify({ countryCode: '+7', phone: '7009998888', password: 'password123' });
            const loginRes = await doFetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
                body: loginData
            });
            cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
        }
        
        console.log('Cookie obtained:', cookie);

        console.log('2. Creating 3 Reports in Otrar District (lat: 43.28, lng: 68.23)...');
        for (let i = 1; i <= 3; i++) {
            const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
            const body = `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nfire\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nFire report ${i}\r\n--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nHuge smoke and fire coming from a warehouse in Otrar district.\r\n--${boundary}\r\nContent-Disposition: form-data; name="severity"\r\n\r\nhigh\r\n--${boundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n43.28\r\n--${boundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n68.23\r\n--${boundary}--\r\n`;
            
            const repRes = await doFetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length, 'Cookie': cookie },
                body: body
            });
            console.log(`Report ${i} Status:`, repRes.status, JSON.parse(repRes.data).report?.id);
        }

        console.log('ALL TESTS COMPLETED');
    } catch(e) {
        console.error('Test failed:', e);
    }
}
runTest();
