#!/bin/sh
set -e

if [ -n "$CONFIG" ]; then
	echo "Found configuration variable, will write it to the /usr/src/garie-sentry-metrics/config.json"
	echo "$CONFIG" > /usr/src/garie-sentry-metrics/config.json
fi


if [ -z "$MATOMO_TOKEN" ]; then
   echo "Empty MATOMO_TOKEN"
   exit 0
fi

if [ -z "$SENTRY_AUTHORIZATION" ]; then
   echo "Empty SENTRY_AUTHORIZATION"
   exit 0
fi

if [ -z "$URL_MATOMO" ]; then
   echo "Empty URL_MATOMO"
   exit 0
fi

if [ -z "$URL_SENTRY" ]; then
   echo "Empty URL_SENTRY"
   exit 0
fi

exec "$@"
