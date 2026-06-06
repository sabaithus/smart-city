const http = require('http');

const postData = JSON.stringify({
    countryCode: '+7',
    phone: '7777777777',
    password: '123456'
});

const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const loginReq = http.request(loginOptions, (res) => {
    console.log(`LOGIN STATUS: ${res.statusCode}`);
    const cookies = res.headers['set-cookie'];
    console.log('LOGIN SET-COOKIE:', cookies);
    
    let cookieStr = '';
    if (cookies) {
        cookieStr = cookies[0].split(';')[0];
    }
    
    // Now fetch feed
    const feedOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reports/feed',
        method: 'GET',
        headers: {
            'Cookie': cookieStr
        }
    };
    
    const feedReq = http.request(feedOptions, (feedRes) => {
        console.log(`FEED STATUS: ${feedRes.statusCode}`);
        console.log(`FEED HEADERS: ${JSON.stringify(feedRes.headers)}`);
        feedRes.setEncoding('utf8');
        feedRes.on('data', chunk => {
            console.log(`FEED BODY: ${chunk.substring(0, 200)}`);
        });
    });
    
    feedReq.end();
});

loginReq.write(postData);
loginReq.end();
