const logger = require('../utils/logger');
const request = require('request-promise');

const getData = async url => {
    return new Promise(async (resolve, reject) => {
        logger.info(`Getting data for ${url}`);

        if (process.env.SENTRY_AUTHORIZATION === undefined) {
            return reject('Missing SENTRY_AUTHORIZATION');
        }

        if (process.env.MATOMO_TOKEN === undefined) {
            return reject('Missing MATOMO_TOKEN');
        }

        try {
            if (url.indexOf('matomo') > -1) {
                const data = await request({
                    uri: `${url}index.php?module=API&method=VisitsSummary.get&idSite=3&period=day&date=yesterday&format=JSON&token_auth=${process.env.MATOMO_TOKEN}`,
                    json: true
                });
                resolve(data);
            }
            else {
                const data = await request({
                    uri: url,
                    json: true,
                    resolveWithFullResponse: true,
                    headers: {
                        'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                    }
                });

                // var data = makeRequest(url);
                // Verify if more next data is needed, if so get nextUrl

                resolve(data.body);
                logger.info(`Successfull got data for ${url}`);
            }
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
