const request = require('request-promise');
const extend = require('extend')

const sentry_api_call = async(url, auth, handler, options = {}) => {
    return new Promise(async (resolve, reject) => {
        try {
            var result = []
            while(true){
                var finished = false;
                const data = await request({
                    uri: url,
                    json: true,
                    resolveWithFullResponse: true,
                    headers: {
                        'Authorization': `Bearer `+auth
                    }
                });
                var links = data.headers.link.split(',');

                data.body.forEach(function(item, index) {
                    const item_result = handler(item, options)
                    if (!item_result.finished){
                        if (item_result.add){
                            result.push(item_result.value);
                        }
                    }
                    else {
                        finished = true;
                    }
                });

                var is_last = true;
                links.forEach(function(link) {
                    if (link.indexOf('rel="next"') > -1 && link.indexOf('results="true"') > -1) {
                        url = link.substring(
                            link.lastIndexOf("<") + 1,
                            link.lastIndexOf(">")
                        );
                        is_last = false;
                    }
                });
                if ((finished) || (is_last)){
                    break;
                }

            }
            resolve(result);
        } catch (err) {
            console.log(`Failed to calling sentry api`, err);
            reject(`Failed to calling sentry api`);
        }

    });
}

function handle_projects(item){
    const sentry_id = item.id;
    const sentry_slug = item.slug;
    const sentry_organization_slug = item.organization.slug;
    var value = {value:{},finished:false,add:true }
    value.value[sentry_id] = {
        sentrySlug : sentry_slug,
        organizationSlug : sentry_organization_slug
    }
    return(value);
}

const sentry_projects = async(url, auth) => {
    return new Promise(async (resolve, reject) => {
        try {
            var results = {}
            const call_result = await sentry_api_call(url + `api/0/projects/`, auth, handle_projects)
            call_result.forEach(function(item){
                extend(results,item);
            });
            resolve(results);
        } catch (err) {
            console.log(`Failed to get sentry projects`, err);
            reject(`Failed to get sentry projects`);
        }
    });
}

function handle_issues(item, options){
    var { lastSeen } = item;
    const { period_from } = options
    lastSeen = new Date(lastSeen);

    var value = {value:{},finished:false,add:true }

    if (lastSeen >= period_from){
        value.value = item.id;
    }

    if(lastSeen < period_from) {
        value.finished = true;
        value.add = false;
    }
    return(value);
}

const sentry_issues = async(url, auth, organization_slug, sentry_slug, period_from) => {
    return new Promise(async (resolve, reject) => {
        try {
            const options={
                period_from:period_from
            };
            const call_result = await sentry_api_call(url + `api/0/projects/` + organization_slug + '/' + sentry_slug + '/issues/', auth, handle_issues, options)
            resolve(call_result);
        } catch (err) {
            console.log(`Failed to get sentry issues`, err);
            reject(`Failed to get sentry issues`);
        }
    });
}

function handle_events(item, options){
    const { period_from } = options;
    const { period_to } = options;
    const { issues } = options;

    var { dateReceived } = item;
    dateReceived = new Date(dateReceived);

    var value = {value:{},finished:false, add:true }

    if ((dateReceived >= period_from) && (dateReceived < period_to)){

        const { groupID } = item;
        if (issues.includes(groupID)){
            value.value = item;
        }
        else {
            value.add = false;
        }

    }

    if(dateReceived < period_from) {
        value.finished = true;
        value.add = false;
    }
    if(dateReceived >= period_to) {
        value.add = false;
    }
    return(value);

}

const sentry_events = async(url, auth, organization_slug, sentry_slug, period_from, period_to, issues) => {
    return new Promise(async (resolve, reject) => {
        try {
            var results = {'serverEvents':[], 'jsEvents':[]};
            const options={
                period_from:period_from,
                period_to:period_to,
                issues:issues
            };
            const call_result = await sentry_api_call(url + `api/0/projects/` + organization_slug + '/' + sentry_slug + '/events/', auth, handle_events, options)

            call_result.forEach(function(item){
                const { tags } = item;
                var slot = 'serverEvents';
                for (var i = 0; i < tags.length; i++){
                    if ((tags[i].key === 'logger') && (tags[i].value === 'javascript')){
                        slot = 'jsEvents';
                    }
                }
                results[slot].push(item);
            });

            resolve(results);
        } catch (err) {
            console.log(`Failed to get sentry projects`, err);
            reject(`Failed to get sentry projects`);
        }
    });
}

module.exports = {
    sentry_projects,
    sentry_issues,
    sentry_events
};
