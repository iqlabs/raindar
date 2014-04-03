define(['jQuery'], function (jQuery) {
    function gettingURLsAndTimes() {
        var deferred = new jQuery.Deferred();

        var metAPIKey = "c1d1b645-d1c4-4883-bfb4-2adb3c346f80";
        var metCapabilitiesURL = "http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/all/json/capabilities?key=" + metAPIKey;

        var url_template = [
            'http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/RADAR_UK_Composite_Highres/png?TIME=',
            null,
            'Z&key=', metAPIKey];

        jQuery.ajax(
            {url: metCapabilitiesURL, dataType: 'jsonp'}
        )
            .done(
            function (capabilities_json) {
                var radar = capabilities_json.Layers.Layer[3];
                var radar_times = radar.Service.Times.Time.reverse();

                var images_urls = [];
                var times = [];

                jQuery.each(radar_times, function (index, time) {
                    times.push(new Date(time));
                    images_urls.push(url_template.slice());
                    images_urls[index][1] = time;
                    images_urls[index] = images_urls[index].join('');
                });

                deferred.resolve({
                    images_urls: images_urls,
                    times: times
                });
            }
        ).fail(function () {
                deferred.reject();
            });

        return deferred.promise();
    }

    return {
        gettingURLsAndTimes: gettingURLsAndTimes
    };
});
