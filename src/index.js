const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const request = require('request-promise');
const fs = require('fs-extra');


const myEmptyGetMeasurement = async (item, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            resolve(data);
        } catch (err) {
            console.log(`Failed to save in influx data for ${url}`, err);
            reject(`Failed to save in influx data for ${url}`);
        }
    });
}

const myGetData = async (item) => {
    const { url } = item.url_settings;
    return new Promise(async (resolve, reject) => {
        try {
            const { organization } = item.url_settings;
            const { sentryId } = item.url_settings;
            const { matomoId } = item.url_settings;
            const { reportDir } = item;
            const reportFolder = garie_plugin.utils.helpers.reportDirNow(reportDir);

            var isDebug = false;
            var env_devel = process.env.DEVEL;
            if ((env_devel !== undefined) && (env_devel.trim() === "true")){
                isDebug = true;
            }
            console.log(`Getting sentry data for ${url}`);

            var finished_getting_sentry_events = false;
            var finished_getting_sentry_issues = false;
            var sentry_url_events = `${process.env.URL_SENTRY}api/0/projects/${organization}/${sentryId}/events/`;
            var sentry_url_issues = `${process.env.URL_SENTRY}api/0/projects/${organization}/${sentryId}/issues/`;

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
            console.log(`Successfull got sentry data for ${url}`);


            console.log(`Getting matomo data for ${url}`);

            const data_matomo = await request({
                uri: `${process.env.URL_MATOMO}index.php?module=API&method=VisitsSummary.get&idSite=${matomoId}&period=day&date=yesterday&format=JSON&token_auth=${process.env.MATOMO_TOKEN}`,
                json: true
            });
            console.log(`Successfull got matomo data for ${url}`);


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


            var sentry_file = path.join(reportFolder, 'sentry.json');
            var matomo_file = path.join(reportFolder, 'matomo.json');

            fs.outputJson(sentry_file, data_sentry, {spaces: 2})
            .then(() => console.log(`Saved sentry data file for ${url}`))
            .catch(err => {
              console.log(err)
            })

            fs.outputJson(matomo_file, data_matomo, {spaces: 2})
            .then(() => console.log(`Saved matomo data file for ${url}`))
            .catch(err => {
              console.log(err)
            })

            resolve(total);

        } catch (err) {
            console.log(`Failed to get data for ${url}`, err);
            reject(`Failed to get data for ${url}`);
        }
    });
};



console.log("Start");


const app = express();
app.use('/reports', express.static('reports'), serveIndex('reports', { icons: true }));

const main = async () => {
  garie_plugin.init({
    database:'sentry-metrics',
    getData:myGetData,
    getMeasurement:myEmptyGetMeasurement,
    app_name:'sentry-metrics-results',
    app_root: path.join(__dirname, '..'),
    config:config
  });
}

if (process.env.ENV !== 'test') {
  app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    await main();
  });
}
