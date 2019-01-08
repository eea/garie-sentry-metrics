const { getData } = require('./');
const { getDataMatomo } = require('./');


describe('sentry-metrics', () => {
    describe('getData', () => {
        it('should make a request to get event data from sentry', async () => {
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

        it('should reject when failing to make the request to get sentry data', async () => {
            await expect(getData('www.test.co.uk')).rejects.toEqual('Failed to get data for www.test.co.uk');
        });
    });

    describe('getDataMatomo', () => {
        it('should make a request to get visitors data from matomo', async () => {
            const data = await getDataMatomo('www.test.co.uk');

            expect(data).toEqual({
                nb_uniq_visitors: 8426,
                nb_users: 72726,
                nb_visits: 5035,
                nb_actions: 970700,
                nb_visits_converted: 0,
                bounce_count: 16,
                sum_visit_length: 1,
                max_actions: 7,
                bounce_rate: "33%",
                nb_actions_per_visit: 7.098643,
                avg_time_on_site: 205
            });
        });

        it('should reject when failing to make the request to get visitors data', async () => {
            await expect(getDataMatomo('www.test.co.uk')).rejects.toEqual('Failed to get data for www.test.co.uk');
        });
    });
});
