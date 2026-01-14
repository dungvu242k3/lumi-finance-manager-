const https = require('https');

async function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
            res.on('error', reject);
        });
    });
}

(async () => {
    try {
        console.log('Fetching sample data...');
        // Only fetch 200 items from start and end to avoid timeout/memory issues
        const urlFirst = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json?orderBy="$key"&limitToFirst=200';
        const urlLast = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json?orderBy="$key"&limitToLast=200';

        const [first, last] = await Promise.all([
            fetchData(urlFirst).catch(e => ({})),
            fetchData(urlLast).catch(e => ({}))
        ]);

        const allData = { ...first, ...last };

        const formats = {};
        const examples = {};
        let total = 0;

        Object.values(allData).forEach(item => {
            const date = item['Ngày_lên_đơn'];
            if (!date) return;
            total++;

            let format = 'Unknown';
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) format = 'YYYY-MM-DD';
            else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) format = 'DD/MM/YYYY or MM/DD/YYYY';
            else if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)) format = 'YYYY/MM/DD';
            else if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) format = 'DD-MM-YYYY';
            else if (date.includes('T')) format = 'ISO String';
            else format = 'Other';

            formats[format] = (formats[format] || 0) + 1;
            if (!examples[format]) examples[format] = [];
            if (examples[format].length < 5) examples[format].push(date);
        });

        console.log('Total analyzed:', total);
        console.log('Formats found:', JSON.stringify(formats, null, 2));
        console.log('Examples:', JSON.stringify(examples, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
})();
