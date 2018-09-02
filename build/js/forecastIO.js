define(['jQuery'], function(jQuery) {
  function gettingCurrentWeather(latitude, longitude) {
    var deferred = new jQuery.Deferred();

    var forecastIOAPIKey = '931bb054da507e4747844db62accc6a5';
    var forecastIOUrl = [
      'https://api.forecast.io/forecast',
      forecastIOAPIKey,
      null
    ];

    forecastIOUrl[2] = [latitude, longitude].join(',');

    var forecastIOUrlString = forecastIOUrl.join('/') + '?units=ca&exclude=daily,flags,hourly,minutely';

    jQuery.ajax(
      {url: forecastIOUrlString, dataType:'jsonp'}
    ).done(function(forecast_response) {
      deferred.resolve(forecast_response.currently);
    }).fail(function() {
      deferred.reject();
    });

    return deferred.promise();
  }

  return {
    gettingCurrentWeather: gettingCurrentWeather
  };
});
