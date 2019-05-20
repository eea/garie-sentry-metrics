const updateWithInterval = async(interval, influx, result) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (var i = 0; i < result.length; i++){
                var measurement = result[i];
                query = `   select sum(max_sentry_events) as sum_sentry_events,
                                sum(max_total_visits) as sum_total_visits
                            from (
                                select max(sentry_events) as max_sentry_events,
                                    max(total_visits) as max_total_visits
                                from "${measurement.measurement}"
                                where url = '${measurement.tags.url}'
                                GROUP by time(1d)
                                ORDER by time desc
                                limit ${interval.days})
                            where time < now() - 1d
                            order by time desc`;
                const prev_results = await influx.query(query);
                var visits = 0
                var events = 0

                if (prev_results.groupRows[0] !== undefined){
                    visits = prev_results.groupRows[0].rows[0].sum_total_visits;
                    events = prev_results.groupRows[0].rows[0].sum_sentry_events;
                }
                visits += result[i].fields.total_visits;
                events += result[i].fields.sentry_events;
                var value = 100;
                if (visits != 0){
                    value = Math.max(100 - events / visits * 100, 0);
                }

                result[i].fields[`total_visits_${interval.field}`] = visits;
                result[i].fields[`sentry_events_${interval.field}`] = events;
                result[i].fields[`value_${interval.field}`] = value;
            }
            resolve(result)
        } catch (err) {
            console.log(`Failed to get intervals`, err);
            reject(`Failed to get intervals`);
        }
    });
}
const updateWithIntervals = async(intervals, influx, result) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (var i = 0; i < intervals.length; i++){
                result = await updateWithInterval(intervals[i], influx, result);
            }
            resolve(result);
        } catch (err) {
            console.log(`Failed to get intervals`, err);
            reject(`Failed to get intervals`);
        }
    });
}

module.exports = {
    updateWithIntervals
};
