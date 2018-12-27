FROM node:8.10.0

RUN mkdir -p /usr/src/garie-sentry-metrics
RUN mkdir -p /usr/src/garie-sentry-metrics/reports

WORKDIR /usr/src/garie-sentry-metrics

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-sentry-metrics/reports", "/usr/src/garie-lighthouse/logs"]

ENTRYPOINT ["/usr/src/garie-sentry-metrics/docker-entrypoint.sh"]

CMD ["npm", "start"]
