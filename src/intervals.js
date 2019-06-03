const updateWithInterval = async(interval, influx, result) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (var i = 0; i < result.length; i++){
                var measurement = result[i];
                query = `select max(sentry_events) as max_sentry_events,
                                max(total_visits) as max_total_visits
                        from "${measurement.measurement}"
                        where url = '${measurement.tags.url}'
                        GROUP by time(1d)
                        ORDER by time desc`;
                const prev_results = await influx.query(query);
                var visits = 0;
                var events = 0;
                if (prev_results.groupRows.length > 0){
                    var rows = prev_results.groupRows[0].rows;
                    var today = new Date();
                    for (var j = 0; j < rows.length; j++){
                        var ts = rows[j].time.getNanoTime()/1000000;
                        var d = new Date(ts);
                        var isToday = ((today.getFullYear() === d.getFullYear()) &&
                                        (today.getMonth() === d.getMonth()) &&
                                        (today.getDate() === d.getDate()))
                        if ((j < interval.days) && (!isToday)){
                            events += rows[j].max_sentry_events
                            visits += rows[j].max_total_visits
                        }
                    }
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
