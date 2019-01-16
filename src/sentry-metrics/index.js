const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const request = require('request-promise');

const urlParser = require('url');
const crypto = require('crypto');
const isEmpty = require('lodash.isempty');
const dateFormat = require('dateformat');

function pathNameFromUrl(url) {
  const parsedUrl = urlParser.parse(url),
    pathSegments = parsedUrl.pathname.split('/');
  pathSegments.unshift(parsedUrl.hostname);

  if (!isEmpty(parsedUrl.search)) {
    const md5 = crypto.createHash('md5'),
      hash = md5
        .update(parsedUrl.search)
        .digest('hex')
        .substring(0, 8);
    pathSegments.push('query-' + hash);
  }
  return pathSegments.filter(Boolean).join('-');
}

function reportDir(url) {
    return path.join(__dirname, '../../reports/sentry-metrics-results', pathNameFromUrl(url));
}

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
                        return;
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
            var now = new Date();
            var now_folder = dateFormat(now, "isoUtcDateTime");
            var folder = reportDir(url) + "/" + now_folder;

            var sentry_file = folder + '/' + 'sentry.json';
            var matomo_file = folder + '/' + 'matomo.json';

            fs.outputJson(sentry_file, data_sentry)
            .then(() => logger.info(`Saved sentry data file for ${urlNoProtocol}`))
            .catch(err => {
              logger.warn(err)
            })

            fs.outputJson(matomo_file, data_matomo)
            .then(() => logger.info(`Saved matomo data file for ${urlNoProtocol}`))
            .catch(err => {
              logger.warn(err)
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
