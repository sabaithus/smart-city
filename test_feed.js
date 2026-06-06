const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/feed',
    method: 'GET'
};

const req = http.request(options, res => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', chunk => {
        console.log(`BODY: ${chunk.substring(0, 100)}`);
    });
});
req.end();
