
# Garie sentry-metrics plugin

<p align="center">
  <p align="center">Tool to gather statistics from sentry and matomo, and supports CRON jobs.<p>
</p>

**Highlights**

-   Poll for sentry and matomo statistics and stores the data into InfluxDB
-   View all historic reports.
-   Setup within minutes

## Overview of garie-sentry-metrics

Garie-sentry-metrics was developed as a plugin for the [Garie](https://github.com/boyney123/garie) Architecture.

[Garie](https://github.com/boyney123/garie) is an out the box web performance toolkit, and `garie-securityheaders` is a plugin that generates and stores securityheaders data into `InfluxDB`.

`Garie-sentry-metrics` can also be run outside the `Garie` environment and run as standalone.

If your interested in an out the box solution that supports multiple performance tools like `securityheaders`, `google-speed-insight` and `lighthouse` then checkout [Garie](https://github.com/boyney123/garie).

If you want to run `garie-sentry-metrics` standalone you can find out how below.

## Getting Started

### Prerequisites

-   Docker installed

### Running garie-sentry-metrics

You can get setup with the basics in a few minutes.

First clone the repo.

```sh
git clone https://github.com/eea/garie-sentry-metrics.git
```

Next setup you're config. Edit the `config.json` and add websites to the list.

```javascript
{
  "plugins":{
        "sentry-metrics":{
            "cron": "0 */4 * * *",
            "intervals": [
                {
                    "field": "30days",
                    "days": 30
                }
            ],
            "remove_fields": ["entries"] 
        }
    },
  "cron": "0 */4 * * *",
  "urls": [
    {
      "url": "www.test1.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23
            }
          ],
          "remove_fields": [],
          "matomoId": 12
        }
      }
    },
    {
      "url": "www.test2.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23,
              "filters":{
                "jsEvents":{
                        "operator":"equals", "field":"tags.app_name", "value":"global-search"
                }
              }
            }
          ],
          "remove_fields": ["entries", "context"],
          "matomoId": 12
        }
      }
    },
    {
      "url": "www.test3.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23,
              "filters":{
                "jsEvents":{
                        "operator":"equals", "field":"tags.app_name", "value":"CaR"
                }
              }
            }
          ],
          "matomoId": 12
        }
      }
    },
    {
      "url": "www.test4.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23,
              "filters":{
                "jsEvents":{
                        "operator":"or", "operands":[{"operator":"equals", "field":"tags.app_name", "value":"global-search"}, {"operator":"equals", "field":"tags.app_name", "value":"CaR"}]
                }
              }
            }
          ],
          "matomoId": 12
        }
      }
    },
    {
      "url": "www.test5.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23,
              "filters":{
                "jsEvents":{
                        "operator":"not", "operand":{"operator":"or", "operands":[{"operator":"equals", "field":"tags.app_name", "value":"global-search"}, {"operator":"equals", "field":"tags.app_name", "value":"CaR"}]}
                }
              }
            }
          ],
          "matomoId": 12
        }
      }
    },
    {
      "url": "www.test6.com",
      "plugins": {
        "sentry-metrics":{
          "sentry_config": [
            {
              "sentryId": 23,
              "filters":{
                "jsEvents":{
                        "operator":"not", "operand":{"operator":"equals", "field":"tags.app_name", "value":"global-search"}
                }
              }
            }
          ],
          "matomoId": 12
        }
      }
    }
  ]
}
```

Once you finished edited your config, lets setup our environment.

```sh
docker-compose up
```

This will build your copy of `garie-sentrymetrics` and run the application.

On start, garie-sentrymetrics will start to gather statistics for the websites added to the `config.json`.

## config.json

| Property | Type                | Description                                                                          |
| -------- | ------------------- | ------------------------------------------------------------------------------------ |
| `plugins.sentry-metrics.cron`   | `string` (optional) | Cron timer. Supports syntax can be found [here].(https://www.npmjs.com/package/cron) |
| `plugins.sentry-metrics.retry`   | `object` (optional) | Configuration how to retry the failed tasks |
| `plugins.sentry-metrics.retry.after`   | `number` (optional, default 30) | Minutes before we retry to execute the tasks |
| `plugins.sentry-metrics.retry.times`   | `number` (optional, default 3) | How many time to retry to execute the failed tasks |
| `plugins.sentry-metrics.retry.timeRange`   | `number` (optional, default 360) | Period in minutes to be checked in influx, to know if a task failed |
| `plugins.sentry-metrics.intervals`   | `list` (optional) | A list of intervals to aggregate sentry and matomo statistics |
| `plugins.sentry-metrics.intervals[i]`   | `object` | Aggregation interval configuration |
| `plugins.sentry-metrics.intervals[i].field`   | `string` | Field name where the aggregation will be stored in influx |
| `plugins.sentry-metrics.intervals[i].days`   | `number` | Number of days for the aggregation |
| `plugins.sentry-metrics.remove_fields`   | `list` (optional) | A list of fields to remove from Sentry responses for each url |
| `urls`   | `object` (required) | Config for sentrymetrics. More detail below                                          |

**urls object**

| Property                                                       | Type                 | Description                                                                          |
| -------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `url`                                                          | `string` (required)  | Url to get uptimerobot metrics for.                                                  |
| `plugins`                                                      | `object` (optional)  | To setup custom configurations.                                                      |
| `plugins.sentry-metrics`                                       | `object` (required)  | To setup custom sentry-metrics config.                                               |
| `plugins.sentry-metrics.matomoId`                              | `number` (optional)  | Matomo project Id                                                                    |
| `plugins.sentry-metrics.remove_fields`                         | `list` (optional)    | List of fields to remove from Sentry response.                                       |
| `plugins.sentry-metrics.default_visits_per_day`                | `number` (optional)  | If Matomo project Id is missing, you can specify a default value for number of visits|
| `plugins.sentry-metrics.sentry_config`                         | `list` (required)    | List of sentry configurations                                                        |
| `plugins.sentry-metrics.sentry_config[n].sentryId`             | `number` (optional)  | Unique sentry id. If not specified, *organizationSlug* and *sentrySlug* are required |
| `plugins.sentry-metrics.sentry_config[n].organizationSlug`     | `string` (optional)  | sentry organization name                                                             |
| `plugins.sentry-metrics.sentry_config[n].sentrySlug`           | `string` (optional)  | sentry project name                                                                  |
| `plugins.sentry-metrics.sentry_config[n].filters`              | `json` (optional)    | Describe how to filter sentry messages                                               |
| `plugins.sentry-metrics.sentry_config[n].filters.jsEvents`     | `json` (optional)    | Describe filters for js events                                                       |
| `plugins.sentry-metrics.sentry_config[n].filters.serverEvents` | `json` (optional)    | Describe filters for server events                                                   |

### Configuring the intervals
In the measurement you can store an aggregation of previous results.
For this you have to use the **intervals** property in the plugin configuration:
```javascript
"sentry-metrics":{
    "cron": "0 */4 * * *",
    "intervals": [
        {
            "field": "30days",
            "days": 30
        }
    ]
}
```
It's possible to configure more intervals, ex. for 7days, 30 days:
```javascript
"sentry-metrics":{
    "cron": "0 */4 * * *",
    "intervals": [
        {
            "field": "30days",
            "days": 30
        },
        {
            "field": "7days",
            "days": 7
        }
    ]
}
```
If the **intervals** property is missing, a default configuration will be used, for 30 days.
If you want to entirely disable this feature, you have to set the intervals to an empty list:
```javascript
"sentry-metrics":{
    "cron": "0 */4 * * *",
    "intervals": []
}
```
For minimizing the plugin's memory footprint, it's possible to also remove certain fields from 
the Sentry events responses. This is done via the **remove_fields** property, configurable
both at plugin level and also for each specific url.
To remove the "entries" fields for all accessed url's, **remove_fields** can be set at plugin level
(an empty list or not specifying the field at all can also be used if needed):
```javascript
"sentry-metrics":{
    "cron": "0 */4 * * *",
    "intervals": [],
    "remove_fields": ["entries"]
}
```
For fine-grained control, **remove_fields** can also be specified at url level. In this case, the
plugin-level value will be overridden. For removing no field from Sentry's response, an emtpy list
should be specified:
```javascript
{
    "url": "www.eea.europa.eu",
        "plugins": {
            "sentry-metrics":{
                "sentry_config": [
                    {
                        "sentryId": 23
                    }
                ]
            },
            "matomoId": 12,
            "remove_fields": ["entries", "context"]
        }
    },
},
```
It is recommended to keep the default plugin-level setting of having the "entries" field
removed from all Sentry responses (this field contains traceback information), as this helps 
keep memory usage down.
Be careful though, as removing fields such as "dateCreated" or "eventID" can cause plugin
misbehavior. Generally, removing the "entries" field should be enough to keep memory usage down.
The "context" field is also safe to remove and will lead to a slight reduction in memory use.

For an example of Sentry event structure, please see [Sentry docs].(https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/)

To inspect the events list for a specific project, you can also use curl:
```bash
# use current sentry authentication token below
export TOKEN=0bf625ef98884915b3af2f3f878a3913b8f891b407dc4061acbc5ffcd8d53f1e
curl -H 'Accept: application/json' -H "Authorization: Bearer ${TOKEN}" https://sentry.eea.europa.eu/api/0/projects/eea/bdr-eionet-europa-eu/events/
```

### Configuring the filters
For configuring the filters we have to build a json object
Operators can be:
equals, contains, startsWith, or, and, not
equals, contains, startsWith has 2 operands: field and value
ex:
```javascript
{
    "operator":"equals",
    "field":"tags.app_name",
    "value":"global-search"
}
```
or, and has a list of "subfilters"
ex: 
```javascript
{
    "operator":"or",
    "operands":[
        {
            "operator":"equals",
            "field":"tags.app_name",
            "value":"global-search"
        },
        {
            "operator":"equals",
            "field":"tags.app_name",
            "value":"CaR"}
    ]
}
```
not has a subfilter
ex:
```javascript
{
    "operator":"not",
    "operand":{
        "operator":"equals",
        "field":"tags.app_name",
        "value":"global-search"
    }
}
```

This way it's possible to create complex filters like:
```javascript
{
    "operator":"not",
    "operand":{
        "operator":"or",
        "operands":[
            {
                "operator":"equals",
                "field":"tags.app_name",
                "value":"global-search"
            },
            {
                "operator":"equals",
                "field":"tags.app_name",
                "value":"CaR"
            }
        ]
    }
}
```

## Variables
- URL_SENTRY - url for sentry
- SENTRY_AUTHORIZATION - sentry authorization key
- URL_MATOMO - url for matomo
- MATOMO_TOKEN - matomo token


The results what are added to the database are calculated from the number of sentry events and the number of visits retrieved from matomo.
We generate 2 measurements:
 - jsEvents with the values:
    - total_visits
    - sentry_events
    - value
 - serverErrors with the values:
    - total_visits
    - sentry_events
    - value

In both cases 
 - *total_visits* is read from matomo
 - *sentry_events* is the number of javascript/server errors read and filtered messages from sentry
 - *value* is sentry_events / total_visits * 100
