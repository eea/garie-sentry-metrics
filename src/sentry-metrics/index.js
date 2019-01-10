const fs = require('fs-extra');
const logger = require('../utils/logger');
const request = require('request-promise');

const getData = async (url, sentryId, matomoId) => {
    return new Promise(async (resolve, reject) => {
        try {
            logger.info(`Getting sentry data for ${url}`);

            var finished_getting_sentry_data = false;
            var sentry_url = `${process.env.URL_SENTRY}api/0/projects/eea/${sentryId}/events/`;
            var data_sentry = []
            var yesterday_date = new Date();
            var last_date = new Date();

            yesterday_date.setDate(yesterday_date.getDate() - 1);
            last_date.setDate(last_date.getDate() - 2);

            while (!finished_getting_sentry_data) {
                const data = await request({
                    uri: sentry_url,
                    json: true,
                    resolveWithFullResponse: true,
                    headers: {
                        'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                    }
                });

                data.body.forEach(function(item, index) {
                    var { dateReceived } = item;
                    dateReceived = new Date(dateReceived)

                    if (dateReceived.getDay() == yesterday_date.getDay() &&
                        dateReceived.getMonth() == yesterday_date.getMonth() &&
                        dateReceived.getYear() == yesterday_date.getYear()) {
                            data_sentry.push(item);
                    }
                    if(dateReceived < last_date) {
                        finished_getting_sentry_data = true;
                    }
                });

                var links = data.headers.link.split(',');
                links.forEach(function(link) {
                    if (link.indexOf('rel="next"') > -1 && link.indexOf('results="true"') > -1) {
                        sentry_url = link.substring(
                            link.lastIndexOf("<") + 1,
                            link.lastIndexOf(">")
                        );
                    }
                });
            }
            logger.info(`Successfull got sentry data for ${url}`);


            logger.info(`Getting matomo data for ${url}`);

            const data_matomo = await request({
                uri: `${process.env.URL_MATOMO}index.php?module=API&method=VisitsSummary.get&idSite=${matomoId}&period=day&date=yesterday&format=JSON&token_auth=${process.env.MATOMO_TOKEN}`,
                json: true
            });
            logger.info(`Successfull got matomo data for ${url}`);


            var js_events = 0;
            var server_errors = 0;
            var total = [];
            const { nb_visits } = data_matomo;

            data_sentry.forEach(function(item, index, array) {
                const { tags } = array[index];
                var isJsEvent = false;

                Object.keys(tags).forEach(index_tags => {
                    // Check if js event
                    if (tags[index_tags]['key'] == "logger" && tags[index_tags]['value'] == "javascript") {
                        isJsEvent = true;
                    }
                });

                if (isJsEvent) {
                    js_events++;
                }
                else {
                    server_errors++;
                }
            });

            total.push({
                measurement: 'JsEvents/TotalVisits',
                tags: { url },
                fields: { value: js_events / nb_visits * 100, total_visits: nb_visits, sentry_events: js_events }
            });

            total.push({
                measurement: 'ServerErrors/TotalVisits',
                tags: { url },
                fields: { value: server_errors / nb_visits * 100, total_visits: nb_visits, sentry_events: server_errors }
            });


            var urlNoProtocol = url.replace(/^https?\:\/\//i, "").replace("/", "");
            var folder = '/usr/src/garie-sentry-metrics/data-logs/' + new Date().toLocaleDateString().split('/').join('-');
            var sentry_file = folder + '/' + 'sentry-' + urlNoProtocol;
            var matomo_file = folder + '/' + 'matomo-' + urlNoProtocol;

            fs.outputJson(sentry_file, data_sentry)
            .then(() => console.log(`Saved sentry data file for ${urlNoProtocol}`))
            .catch(err => {
              console.error(err)
            })

            fs.outputJson(matomo_file, data_matomo)
            .then(() => console.log(`Saved matomo data file for ${urlNoProtocol}`))
            .catch(err => {
              console.error(err)
            })

            resolve(total);
        } catch (err) {
            logger.warn(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};

module.exports = {
    getData
};
