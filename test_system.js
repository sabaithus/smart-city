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
        console.log('1. Testing Login...');
        const loginData = JSON.stringify({ countryCode: '+7', phone: '7000000001', password: 'password123' });
        const loginRes = await doFetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
            body: loginData
        });
        console.log('Login Status:', loginRes.status);
        const setCookie = loginRes.headers['set-cookie'];
        const cookie = setCookie ? setCookie[0].split(';')[0] : '';
        console.log('Cookie obtained:', cookie ? 'YES' : 'NO');

        console.log('2. Testing Report Creation (without image)...');
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const body = `--${boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\nother\r\n--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTest Report\r\n--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nA test incident report to see if AI prioritization sets it to other/medium or detects it. Water flooding everywhere.\r\n--${boundary}\r\nContent-Disposition: form-data; name="severity"\r\n\r\nmedium\r\n--${boundary}--\r\n`;
        const reportRes = await doFetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length, 'Cookie': cookie },
            body: body
        });
        console.log('Report Status:', reportRes.status);
        const reportData = JSON.parse(reportRes.data);
        console.log('Report result:', reportData);

        console.log('ALL TESTS COMPLETED');
    } catch(e) {
        console.error('Test failed:', e);
    }
}
runTest();
