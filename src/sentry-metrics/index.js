const logger = require('../utils/logger');
const request = require('request-promise');

const getData = async (url, sentryId) => {
    return new Promise(async (resolve, reject) => {
        logger.info(`Getting sentry data for ${url}`);

        try {
            const data = await request({
                uri: `${process.env.URL_SENTRY}api/0/projects/eea/${sentryId}/events/`,
                json: true,
                resolveWithFullResponse: true,
                headers: {
                    'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                }
            });

            // var data = makeRequest(url);
            // Verify if more next data is needed, if so get nextUrl

            resolve(data.body);
            logger.info(`Successfull got sentry data for ${url}`);
        } catch (err) {
            logger.warn(`Failed to get sentry data for ${url}`, err);
            reject(`Failed to get sentry data for ${url}`);
        }
    });
};


const getDataMatomo = async (url, matomoId) => {
    return new Promise(async (resolve, reject) => {
        logger.info(`Getting matomo data for ${url}`);

        try {
            const data = await request({
                uri: `${process.env.URL_MATOMO}index.php?module=API&method=VisitsSummary.get&idSite=${matomoId}&period=day&date=yesterday&format=JSON&token_auth=${process.env.MATOMO_TOKEN}`,
                json: true
            });
            resolve(data);

        } catch (err) {
            logger.warn(`Failed to get matomo data for ${url}`, err);
            reject(`Failed to get matomo data for ${url}`);
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
    getData,
    getDataMatomo
};
