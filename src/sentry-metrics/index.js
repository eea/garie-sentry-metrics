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
            var isDebug = false;
            logger.info(`Getting sentry data for ${url}`);

            var finished_getting_sentry_events = false;
            var finished_getting_sentry_issues = false;
            var sentry_url_events = `${process.env.URL_SENTRY}api/0/projects/eea/${sentryId}/events/`;
            var sentry_url_issues = `${process.env.URL_SENTRY}api/0/projects/eea/${sentryId}/issues/`;
//TODO: remove hardcoded eea

            var data_sentry = {jsEvents:[], serverEvents:[]};
            var yesterday_date = new Date();
            var last_date = new Date();
            var sentry_issues = [];

            yesterday_date.setDate(yesterday_date.getDate() - 1);
            last_date.setDate(last_date.getDate() - 2);

            while (!finished_getting_sentry_issues) {
                const data = await request({
                    uri: sentry_url_issues,
                    json: true,
                    resolveWithFullResponse: true,
                    headers: {
                        'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                    }
                });

                data.body.forEach(function(item, index) {
                    var { lastSeen } = item;
                    lastSeen = new Date(lastSeen);

                    if (lastSeen >= last_date){
                        sentry_issues.push(item.id);
                    }
                    if(lastSeen < last_date) {
                        finished_getting_sentry_issues = true;
                        return;
                    }

                });

                var links = data.headers.link.split(',');
                links.forEach(function(link) {
                    if (link.indexOf('rel="next"') > -1 && link.indexOf('results="true"') > -1) {
                        sentry_url_issues = link.substring(
                            link.lastIndexOf("<") + 1,
                            link.lastIndexOf(">")
                        );
                    }
                });
            }

            while (!finished_getting_sentry_events) {
                const data = await request({
                    uri: sentry_url_events,
                    json: true,
                    resolveWithFullResponse: true,
                    headers: {
                        'Authorization': `Bearer ${process.env.SENTRY_AUTHORIZATION}`
                    }
                });

                data.body.forEach(function(item, index) {
                    var { dateReceived } = item;
                    dateReceived = new Date(dateReceived);

                    if (dateReceived.getDay() == yesterday_date.getDay() &&
                        dateReceived.getMonth() == yesterday_date.getMonth() &&
                        dateReceived.getYear() == yesterday_date.getYear()) {
                            const { tags } = item;
                            const { groupID } = item;
                            var shouldAdd = true;
                            var slot = 'serverEvents';
                            if ( sentry_issues.includes(groupID) ){
                                for (var i = 0; i < tags.length; i++){
                                    if ((tags[i].key === 'logger') && (tags[i].value === 'javascript')){
                                        slot = 'jsEvents';
                                    }
                                }
                                var tmp_env = {
                                    eventID: item.eventID,
                                    groupID: item.groupID,
                                    id: item.id,
                                    message: item.message
                                };
                                if (isDebug){
                                    tmp_env = item;
                                }
                                data_sentry[slot].push(tmp_env);
                            }
                    }
                    if(dateReceived < last_date) {
                        finished_getting_sentry_events = true;
                        return;
                    }
                });

                var links = data.headers.link.split(',');
                links.forEach(function(link) {
                    if (link.indexOf('rel="next"') > -1 && link.indexOf('results="true"') > -1) {
                        sentry_url_events = link.substring(
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


            var js_events = data_sentry.jsEvents.length;
            var server_errors = data_sentry.serverEvents.length;
            var total = [];
            const { nb_visits } = data_matomo;

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

            fs.outputJson(sentry_file, data_sentry, {spaces: 4})
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
