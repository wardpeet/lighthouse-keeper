const URL = require('url');
const fs = require('fs');
const execa = require('execa');
const sites = require('./sites.json');
const MAX_RETRY = 3;

const date = new Date();
const timeStr = date.toLocaleTimeString('en-US', {hour12: false});
const dateParts = date.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
}).split('/');

dateParts.unshift(dateParts.pop());
const dateStr = dateParts.join('-');

function runLighthouse(site, type, index = 1) {
    const hostname = URL.parse(site).hostname;
    const reportPath = `./reports/${hostname}_${dateStr}.${type}.json`;

    let args ='';
    if (type === 'desktop') {
        args = ' --disable-device-emulation --disable-cpu-throttling --disable-network-throttling';
    }

    execa.shellSync(`yarn lighthouse ${site} ${args} --output json --output-path ${reportPath}`);

    if (index++ < MAX_RETRY && reportHasTracingError(reportPath)) {
        console.log(`Retry ${site} (${type}) - ${index}`);
        runLighthouse(site, type, index);
    }
}

function reportHasTracingError(report) {
    const data = fs.readFileSync(report).toString();
    return data.includes('NO_TRACING_STARTED');
}

sites.desktop.forEach(site => {
    console.log(`Run ${site} (desktop)`);
    runLighthouse(site, 'desktop');
});

sites.mobile.forEach(site => {
    console.log(`Run ${site} (mobile)`);
    runLighthouse(site, 'mobile');
});