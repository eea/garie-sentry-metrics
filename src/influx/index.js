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
        var js_events = [];
        var server_errors = [];
        var insightData = {};

        data.forEach(function(item, index, array) {
            const { tags } = array[index];
            const { eventID } = array[index];
            const { dateCreated } = array[index];
            var event_url = "https://www.eea.europa.eu/";
            var isJsEvent = false;

            Object.keys(tags).forEach(index_tags => {
                // Check if js event
                if (tags[index_tags]['key'] == "logger" && tags[index_tags]['value'] == "javascript") {
                    isJsEvent = true;
                }

                if (tags[index_tags]['key'] == "url") {
                    event_url = tags[index_tags]['value'];
                }

                const val = typeof tags[index_tags] === 'string' ? parseInt(tags[index_tags]) : tags[index_tags];
                tags[index_tags] = val;
            });

            if (isJsEvent) {
                js_events.push({
                    measurement: 'JsEvents',
                    tags: { ids: eventID, date: dateCreated, url: event_url},
                    fields: { date: dateCreated}
                });
            }
            else {
                server_errors.push({
                    measurement: 'ServerErrors',
                    tags: { ids: eventID, date: dateCreated, url: event_url},
                    fields: { date: dateCreated}
                });

            }
        });

        const result = await influx.writePoints(js_events.concat(server_errors));
        logger.info(`Successfully saved sentry-metrics sentry data for ${url}`);
        return result;
    } catch (err) {
        logger.error(`Failed to save sentry-metrics sentry data for ${url}`, err);
        return Promise.reject(`Failed to save sentry data into influxdb for ${url}`);
    }
};

/**
 * Insert all key value pairs into the DB
 * @param {String} url - Url from the peroformance data to save
 * @param {*} data - Data to save
 */
const saveDataMatomo = async (url, data) => {
    try {
        const points = Object.keys(data).reduce((points, key) => {
            if (data[key]) {
                points.push({
                    measurement: key,
                    tags: { url },
                    fields: { value: data[key] }
                });
            }
            return points;
        }, []);

        const result = await influx.writePoints(points);
        logger.info(`Successfully saved sentry-metrics matomo data.`);
        return result;
    } catch (err) {
        logger.error(`Failed to save sentry-metrics matomo data.`, err);
        return Promise.reject(`Failed to save matomo data into influxdb`);
    }
};

module.exports = {
    influx,
    init,
    saveData,
    saveDataMatomo
};
