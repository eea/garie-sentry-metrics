const request = require('supertest');
const express = require('express');
const router = express.Router();
const { getData } = require('../../sentry-metrics');
const { getDataMatomo } = require('../../sentry-metrics');
const { saveData } = require('../../influx');
const { saveDataMatomo } = require('../../influx');
// const saveReport = require('../../utils/save-report');

const { app } = require('../../');

jest.mock('../../sentry-metrics', () => {
    return {
        getData: jest.fn(() => Promise.resolve()),
        getDataMatomo: jest.fn(() => Promise.resolve())
    };
});

jest.mock('../../influx', () => {
    return {
        saveData: jest.fn(() => Promise.resolve()),
        saveDataMatomo: jest.fn(() => Promise.resolve())
    };
});

// jest.mock('../../utils/save-report', () => jest.fn());

describe('webhooks', () => {
    beforeEach(() => {
        getData.mockClear();
        getDataMatomo.mockClear();
        saveData.mockClear();
        saveDataMatomo.mockClear();
        // saveReport.mockClear();
    });

    describe('/collect', () => {
        it('returns a 400 when no url is given in the payload', async () => {
            await request(app)
                .post('/collect')
                .set('Accept', 'application/json')
                .expect(400);
        });

        it('returns a 500 when trying to getData from sentry-metrics but it fails', async () => {
            getData.mockRejectedValue();
            getDataMatomo.mockRejectedValue();

            await request(app)
                .post('/collect')
                .send({ url: 'https://www.example.co.uk' })
                .set('Accept', 'application/json')
                .expect(500);
        });

        it('returns a 500 when trying to save sentry-metrics data into influxdb but it fails', async () => {
            saveData.mockRejectedValue();
            saveDataMatomo.mockRejectedValue();

            await request(app)
                .post('/collect')
                .send({ url: 'https://www.example.co.uk' })
                .set('Accept', 'application/json')
                .expect(500);
        });

        it('returns a 201 with sentry-metrics report when successfully getting data from sentry-metrics', async done => {
            saveData.mockResolvedValue();
            saveDataMatomo.mockRejectedValue();
            getData.mockResolvedValue();
            getDataMatomo.mockResolvedValue();

            request(app)
                .post('/collect')
                .send({ url: 'https://www.example.co.uk' })
                .set('Accept', 'application/json')
                .expect(201)
                .end(err => {
                    expect(saveData).toHaveBeenCalled();
                    done();
                });
        });
    });
});
