const garie_plugin = require('garie-plugin')
const path = require('path');
const config = require('../config');
const express = require('express');
const bodyParser = require('body-parser');
const serveIndex = require('serve-index');
const request = require('request-promise');
const fs = require('fs-extra');
const sentry_api = require('./sentry');
const filtering = require('./filtering');

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
            const { matomoId } = item.url_settings;
            if (matomoId === undefined){
                const exception = `Missing matomo id for ${url}`
                console.log(exception);
                reject(exception);
                return;
            }
            var {sentry_config} = item.url_settings;
            if (sentry_config === undefined){
                const exception = `Missing sentry config for ${url}`
                console.log(exception);
                reject(exception);
                return;
            }
            const { reportDir } = item;

            const reportFolder = garie_plugin.utils.helpers.reportDirNow(reportDir);

            var isDebug = false;
            var env_devel = process.env.DEVEL;
            if ((env_devel !== undefined) && (env_devel.trim() === "true")){
                isDebug = true;
            }
            const sentry_base_url = `${process.env.URL_SENTRY}`;
            const sentry_auth = `${process.env.SENTRY_AUTHORIZATION}`;

            var sentry_projects = await sentry_api.sentry_projects(sentry_base_url, sentry_auth);

            var period_from = new Date();
            period_from.setDate(period_from.getDate() - 1);
            period_from.setHours(0,0,0,0)
            var period_to = new Date();
            period_to.setDate(period_to.getDate());
            period_to.setHours(0,0,0,0)

            var data_sentry = {"jsEvents":[], "serverEvents":[]};
            console.log(`Getting sentry data for ${url}`);
            for (var i = 0; i < sentry_config.length; i++){
                var { organizationSlug } = sentry_config[i];
                var { sentrySlug } = sentry_config[i];
                const { sentryId } = sentry_config[i];
                const { filters } = sentry_config[i];

                if (sentryId !== undefined){
                    sentrySlug = sentry_projects[sentryId].sentrySlug;
                    organizationSlug = sentry_projects[sentryId].organizationSlug;
                }

                const sentry_issues = await sentry_api.sentry_issues(sentry_base_url, sentry_auth, organizationSlug, sentrySlug, period_from);

                const data_sentry_tmp = await sentry_api.sentry_events(sentry_base_url, sentry_auth, organizationSlug, sentrySlug, period_from, period_to, sentry_issues);

                data_sentry['jsEvents'] = data_sentry['jsEvents'].concat(data_sentry_tmp['jsEvents']);
                data_sentry['serverEvents'] = data_sentry['serverEvents'].concat(data_sentry_tmp['serverEvents']);

                filtered_data_sentry = {"jsEvents":[], "serverEvents":[]};
                if (filters !== undefined){
                    if (filters['jsEvents'] !== undefined){
                        data_sentry['jsEvents'].forEach(function(item){
                            item.tags_obj = {tags:{}};
                            item.tags.forEach(function(tag_val){
                                item.tags_obj.tags[tag_val.key] = tag_val.value;
                            });
                            if(filtering.parseExpr(filters['jsEvents'], item)){
                                filtered_data_sentry['jsEvents'].push(item);
                            }
                        });
                        data_sentry['jsEvents'] = filtered_data_sentry['jsEvents']
                    }
                    if (filters['serverEvents'] !== undefined){
                        data_sentry['serverEvents'].forEach(function(item){
                            item.tags_obj = {tags:{}};
                            item.tags.forEach(function(tag_val){
                                item.tags_obj.tags[tag_val.key] = tag_val.value;
                            });
                            if(filtering.parseExpr(filters['serverEvents'], item)){
                                filtered_data_sentry['serverEvents'].push(item);
                            }
                        });
                        data_sentry['serverEvents'] = filtered_data_sentry['serverEvents']
                    }
                }
            }
            console.log(`Successfull got sentry data for ${url}`);
            var js_events = data_sentry.jsEvents.length;
            var server_errors = data_sentry.serverEvents.length;

            console.log(`Getting matomo data for ${url}`);

            const data_matomo = await request({
                uri: `${process.env.URL_MATOMO}index.php?module=API&method=VisitsSummary.get&idSite=${matomoId}&period=day&date=yesterday&format=JSON&token_auth=${process.env.MATOMO_TOKEN}`,
                json: true
            });
            console.log(`Successfull got matomo data for ${url}`);


            var total = [];
            const { nb_visits } = data_matomo;

            var js_val = 100;
            var server_val = 100;
            if (nb_visits != 0){
                js_val = 100 - js_events / nb_visits * 100;
                server_val = 100 - server_errors / nb_visits * 100
            }
            total.push({
                measurement: 'JsEvents/TotalVisits',
                tags: { url },
                fields: { value: js_val, total_visits: nb_visits, sentry_events: js_events }
            });

            total.push({
                measurement: 'ServerErrors/TotalVisits',
                tags: { url },
                fields: { value: server_val, total_visits: nb_visits, sentry_events: server_errors }
            });


            var sentry_file = path.join(reportFolder, 'sentry.json');
            var matomo_file = path.join(reportFolder, 'matomo.json');

            if (!isDebug){
                var data_sentry_prod = {"jsEvents":[], "serverEvents":[]};
                data_sentry['jsEvents'].forEach(function(item){
                    var tmp_item = {
                        eventID: item.eventID,
                        groupID: item.groupID,
                        id: item.id,
                        message: item.message
                    };
                    data_sentry_prod['jsEvents'].push(tmp_item);
                });
                data_sentry['serverEvents'].forEach(function(item){
                    var tmp_item = {
                        eventID: item.eventID,
                        groupID: item.groupID,
                        id: item.id,
                        message: item.message
                    };
                    data_sentry_prod['serverEvents'].push(tmp_item);
                });
                data_sentry = data_sentry_prod;
            }
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
  return new Promise(async (resolve, reject) => {
    try{
      garie_plugin.init({
        db_name:'sentry-metrics',
        getData:myGetData,
        getMeasurement:myEmptyGetMeasurement,
        plugin_name:'sentry-metrics',
        report_folder_name:'sentry-metrics-results',
        app_root: path.join(__dirname, '..'),
        config:config
      });
    }
    catch(err){
      reject(err);
    }
  });
}

if (process.env.ENV !== 'test') {
  const server = app.listen(3000, async () => {
    console.log('Application listening on port 3000');
    try{
      await main();
    }
    catch(err){
      console.log(err);
      server.close();
    }
  });
}
