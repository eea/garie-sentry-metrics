const influx = require('./influx');
const logger = require('../utils/logger');

/**
 * Bootstrap the database
 */
const init = async () => {
    try {
        const names = await influx.getDatabaseNames();
        if (names.indexOf('sentry-metrics') === -1) {
            logger.info('InfluxDB: sentry-metrics database does not exist. Creating database');
            return influx.createDatabase('sentry-metrics');
        }
        logger.info('InfluxDB', 'sentry-metrics database already exists. Skipping creation.');
        return Promise.resolve();
    } catch (err) {
        console.log(err);
        return Promise.reject('Failed to initialise influx');
    }
};

/**
 * Insert all key value pairs into the DB
 * @param {String} url - Url from the peroformance data to save
 * @param {*} data - Data to save
 */
const saveData = async (url, data) => {
    try {
        const result = await influx.writePoints(data);
        logger.info(`Successfully saved sentry-metrics sentry data for ${url}`);
        return result;
    } catch (err) {
        logger.error(`Failed to save sentry-metrics sentry data for ${url}`, err);
        return Promise.reject(`Failed to save sentry data into influxdb for ${url}`);
    }
};

module.exports = {
    influx,
    init,
    saveData
};
