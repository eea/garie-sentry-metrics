const CronJob = require('cron').CronJob;
const express = require('express');
const bodyParser = require('body-parser');

const collect = require('./routes/collect');
const logger = require('./utils/logger');
const config = require('../config');

const { init, saveData, saveDataMatomo } = require('./influx');

const { getData } = require('./sentry-metrics');

const app = express();
app.use(bodyParser.json());

const { urls, cron } = config;

app.use('/collect', collect);

const getDataForAllUrls = async () => {
    for (const item of urls) {
        const { url } = item;
        try {
            const data = await getData(url);
            if (url.indexOf('matomo') > -1) {
                await saveDataMatomo(url, data);
            }
            else {
                await saveData(url, data);
            }
        } catch (err) {
            logger.error(url, data);
            logger.error(`Failed to parse ${url}`, err);
        }
    }
};

const main = async () => {
    await init();

    try {
        if (cron) {
            return new CronJob(
                cron,
                async () => {
                    getDataForAllUrls();
                },
                null,
                true,
                'Europe/London',
                null,
                true
            );
        }
    } catch (err) {
        console.log(err);
    }
};

if (process.env.ENV !== 'test') {
    app.listen(3000, async () => {
        console.log('Application listening on port 3000');
        await main();
    });
}

if (!process.env.SENTRY_AUTHORIZATION) {
    logger.error('Missing SENTRY_AUTHORIZATION KEY. Please go to https://developers.google.com/speed/docs/insights/v4/first-app to get one');
    process.exit(1);
}

module.exports = {
    main,
    app
};
