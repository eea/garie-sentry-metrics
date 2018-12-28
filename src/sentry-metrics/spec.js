const { getData } = require('./');
const sentryMetricsData = require('../../test/mock-data/sentry-metrics.json');

const nock = require('nock');

nock('https://www.googleapis.com')
    .get('/pagespeedonline/v4/runPagespeed?url=www.test.co.uk&strategy=mobile&key=1234')
    .reply(200, sentryMetricsData);

describe('sentry-metrics', () => {
    describe('getData', () => {
        it('should reject if no API key is defined', async () => {
            delete process.env.SENTRY_AUTHORIZATION;
            await expect(getData('www.test.co.uk')).rejects.toEqual('Missing SENTRY_AUTHORIZATION');
            process.env.SENTRY_AUTHORIZATION = '1234';
        });

        it('should make a request to get page speed data from google and return pageStats data', async () => {
            const data = await getData('www.test.co.uk');

            expect(data).toEqual({
                cssResponseBytes: 8426,
                htmlResponseBytes: 72726,
                imageResponseBytes: 5035,
                javascriptResponseBytes: 970700,
                numRenderBlockingRoundTrips: 0,
                numTotalRoundTrips: 16,
                numberCssResources: 1,
                numberHosts: 7,
                numberJsResources: 5,
                numberResources: 12,
                numberStaticResources: 7,
                otherResponseBytes: 14467,
                overTheWireResponseBytes: 370861,
                totalRequestBytes: 1961
            });
        });

        it('should reject when failing to make the request to get page speed insight data', async () => {
            nock('https://www.googleapis.com')
                .get('/pagespeedonline/v4/runPagespeed?url=www.test.co.uk&strategy=mobile&key=1234')
                .reply(500);

            await expect(getData('www.test.co.uk')).rejects.toEqual('Failed to get data for www.test.co.uk');
        });
    });
});
