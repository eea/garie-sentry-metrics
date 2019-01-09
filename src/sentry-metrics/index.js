const logger = require('../utils/logger');
const request = require('request-promise');

const getData = async (url, sentryId, matomoId) => {
    return new Promise(async (resolve, reject) => {
        try {
            logger.info(`Getting sentry data for ${url}`);

            const data_sentry = await request({
                uri: `${process.env.URL_SENTRY}api/0/projects/eea/${sentryId}/events/`,
                json: true,
                resolveWithFullResponse: true,
                headers: {
                    'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                }
            });

            logger.info(`Successfull got sentry data for ${url}`);

            // Verify if more next data is needed, if so get nextUrl
            // var data = makeRequest(url);

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

            data_sentry.body.forEach(function(item, index, array) {
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

            // tot_open_js_events / tot_number_visits
            // tot_open_server_errors / tot_number_visits

            total.push({
                measurement: 'ServerErrors/TotalVisits',
                tags: { url },
                fields: { value: js_events / nb_visits * 100 }
            });

            total.push({
                measurement: 'JsEvents/TotalVisits',
                tags: { url },
                fields: { value: server_errors / nb_visits * 100 }
            });

            resolve(total);
        } catch (err) {
            logger.warn(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};

// var makeRequest = async url =  (url) {
//     var options = {
//         uri: url,
//         json: true,
//         resolveWithFullResponse: true,
//         headers: {
//             'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
//         }
//     };
//     const data = await request(options);
//     return data;
// }

function getNextUrl(data) {
    var links = data.headers.link.split(',');
    links.forEach(function(item, index) {
        if (item.indexOf('rel="next"') > -1 && item.indexOf('results="true"') > -1) {
            var nextUrl = item.substring(
                item.lastIndexOf("<") + 1,
                item.lastIndexOf(">")
            );
        }
    });
}

module.exports = {
    getData
};
