const fs = require('fs-extra');
const { getData } = require('./');
const express = require('express')
const app = express()
const port = 3000

describe('sentry-metrics', () => {
    describe('getData', () => {
        it('finds and resolves the sentry and matomo results for the given url', async () => {

            var today = new Date();
            var yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            var old = new Date();
            old.setDate(old.getDate() - 2);

            var issues = [
                {
                    lastSeen:today,
                    id:0
                },
                {
                    lastSeen:today,
                    id:1
                }, 
                {
                    lastSeen:yesterday,
                    id:2 
                },
                {
                    lastSeen:yesterday,
                    id:3
                },
                {
                    lastSeen:old,
                    id:4
                }, 
                {
                    lastSeen:old,
                    id:5 
                }
            ];

            var events = [
                {
                    dateReceived:today,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:0,
                    message:'test 0',
                    eventID:0,
                },
                {
                    dateReceived:today,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:1,
                    message:'test 1',
                    eventID:1,
                },
                {
                    dateReceived:yesterday,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:0,
                    message:'test 2',
                    eventID:2,
                },
                {
                    dateReceived:yesterday,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:2,
                    message:'test 3',
                    eventID:3,
                },
                {
                    dateReceived:yesterday,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:1,
                    message:'test 4',
                    eventID:4,
                },
                {
                    dateReceived:yesterday,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:3,
                    message:'test 5',
                    eventID:5,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:0,
                    message:'test 6',
                    eventID:6,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:2,
                    message:'test 7',
                    eventID:7,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'javascript'}],
                    groupID:4,
                    message:'test 8',
                    eventID:8,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:1,
                    message:'test 9',
                    eventID:9,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:3,
                    message:'test 10',
                    eventID:10,
                },
                {
                    dateReceived:old,
                    tags:[{key:'logger', 'value':'server'}],
                    groupID:5,
                    message:'test 11',
                    eventID:11,
                }
            ];
            app.get('/sentry/api/0/projects/test/test/events/', (req, res) => res.set('link',[]).send(events))
            app.get('/sentry/api/0/projects/test/test/issues/', (req, res) => res.set('link',[]).send(issues))
            app.get('/matomo/index.php', (req, res) => res.send({nb_visits:100}))
            app.listen(port, () => console.log(`Mock server listening on port ${port}!`))


            process.env.URL_SENTRY = "http://localhost:3000/sentry/";
            process.env.URL_MATOMO = "http://localhost:3000/matomo/";
            const result = await getData('www.test.com', 'test', 'test', 'test');

            expect(result).toEqual([{"fields": {"sentry_events": 2, "total_visits": 100, "value": 2}, "measurement": "JsEvents/TotalVisits", "tags": {"url": "www.test.com"}}, {"fields": {"sentry_events": 2, "total_visits": 100, "value": 2}, "measurement": "ServerErrors/TotalVisits", "tags": {"url": "www.test.com"}}]);
        });

    });
});
