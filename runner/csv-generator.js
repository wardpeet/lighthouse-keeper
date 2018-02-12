const fs = require('fs');
const {promisify} = require('util');
const {uploadFile} = require('./firebase-uploader');

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

(async () => {
    const files = await readDir('./reports');
    
    const data = await Promise.all(files.map(async (file) => {
        const lighthouseReport = require(`./reports/${file}`);
        const audits = lighthouseReport.audits;
        const failedAudits = [];
        for (const auditName in audits) {
            if (
                audits[auditName].debugString && (
                    audits[auditName].debugString.includes('Audit error') ||
                    audits[auditName].debugString.includes('NO_TRACING_STARTED')
                )
            ) {
                failedAudits.push(auditName);
            }
        }

        const uploadLink = await uploadFile(`./reports/${file}`);

        //url;isMobile;score;failedAudits;report;time
        return {
            url: `=HYPERLINK("${lighthouseReport.url}")`,
            isMobile: file.includes('mobile'),
            score: Math.round(lighthouseReport.score),
            failedAudits: failedAudits.join(', '),
            report: `=HYPERLINK("https://lighthouse-keeper.firebaseapp.com/?file=${encodeURIComponent(uploadLink)}")`,
            time: Math.round(lighthouseReport.timing.total / 1000),
        };
    }));

    const headers = Object.keys(data[0]).join(';');
    const dataString = data.map(row => Object.values(row).join(';'));

    await writeFile('./test.csv', `${headers}\n${dataString.join('\n')}`);
})();