const { getData } = require('./');


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
});
