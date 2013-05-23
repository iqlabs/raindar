var raindar = function () {
  var _raindar = this;

  var currentLocationLatitude = 52.6675;
  var currentLocationLongitude = -8.6261;
  var currentCity = 'Limerick';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        currentLocationLatitude = position.coords.latitude;
        currentLocationLongitude = position.coords.longitude;
        var google_geocoder = new google.maps.Geocoder();
        var google_latlon = new google.maps.LatLng(currentLocationLatitude, currentLocationLongitude);
        google_geocoder.geocode({'latLng': google_latlon}, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            jQuery.each(results, function(index, result) {
              var cityFound = false;
              jQuery.each(result.types, function(index, type) {
                if (type === 'locality') {
                  currentCity = result.address_components[index].short_name;
                  cityFound = true;
                  return false;
                }
              });
              if (cityFound === true) {
                return false;
              }
            });
          }
          jQuery('#info-location-time-wrapper .location').html(currentCity);
        });
        refreshData();
      },
      function(error) {
        var errors = {
          1: 'Permission denied',
          2: 'Position unavailable',
          3: 'Request timeout'
        };
        refreshData();
      }
    );
  }
  else {
    refreshData();
  }

  function refreshData() {

    jQuery('#info-location-time-wrapper .location').html(currentCity);

    // Get data from forecast.io
    var forecastIOAPIKey = '931bb054da507e4747844db62accc6a5';
    var forecastIOUrl = [
      'https://api.forecast.io/forecast',
      forecastIOAPIKey,
      null
    ];

    forecastIOUrl[2] = [currentLocationLatitude, currentLocationLongitude].join(',');

    var forecastIOUrlString = forecastIOUrl.join('/') + '?units=si&exclude=daily,flags,hourly,minutely';

    var loadingForecast =
    jQuery.ajax(
      {url: forecastIOUrlString, dataType:'jsonp'}
    ).done(function(forecast_response) {
      var currentConditions = forecast_response.currently;
      var windBearing = typeof currentConditions.windBearing !== 'undefined' ? parseInt(currentConditions.windBearing, 10) : 0;
      var windSpeed = typeof currentConditions.windSpeed !== 'undefined' ? parseInt(currentConditions.windSpeed, 10) : '?';
      var precipitationProbability = typeof currentConditions.precipProbability !== 'undefined' ? parseInt(currentConditions.precipProbability, 10) : '?';
      var temperature = typeof currentConditions.temperature !== 'undefined' ? parseInt(currentConditions.temperature, 10) : '?';

      // windBearing from forecast.io is the direction where the wind is coming from, so substract 180 degrees
      currentConditions.windBearing = currentConditions.windBearing - 180;
      jQuery('#info-wind-speed').animate({ left: 0, top: 0 }, {
        step: function(now, fx) {
          jQuery(this).css('transform','rotate('+(fx.pos * currentConditions.windBearing)+'deg)');
        },
        duration: 1000
      });
      jQuery('.info-wind-speed-text').html(windSpeed + ' km/h');
      jQuery('.info-precipitation-chance-text').html(precipitationProbability + '%');
      jQuery('.info-temperature-text').html(temperature + ' &deg;C');
    });



    // Based on example found on https://metoffice-datapoint.googlegroups.com/attach/808f7dc2715d62d7/datapoint_openlayers_example.html?gda=pIdDQ0cAAACewIa7WbYlR83d2hhWhZ6AzmKI5fq-fBVOEpWlD-o5cNAOdB2eqa_XwbgIC4Yv-ZQbQwFxJw55cVwemAxM-EWmeV4duv6pDMGhhhZdjQlNAw&view=1&part=4
    var centerCoordinates = [currentLocationLongitude, currentLocationLatitude];
    var defaultZoomLevel = 7;
    var projection = 'EPSG:4326';

    var northWestBoundData = [-12.0, 48.0];
    var southEastBoundData = [5.0, 61.0];
    var widthImageData = 500;
    var heightImageData = 500;

    var olProjection = new OpenLayers.Projection(projection);
    var centerLonLat = new OpenLayers.LonLat(centerCoordinates);

    var metAPIKey = "c1d1b645-d1c4-4883-bfb4-2adb3c346f80";
    var metCapabilitiesURL = "http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/all/json/capabilities?key=" + metAPIKey;

    var map = new OpenLayers.Map('map');

    var googleMapsLayerStreet = new OpenLayers.Layer.Google("Google Streets",{numZoomLevels: 20});
    var googleMapsLayerSatellite = new OpenLayers.Layer.Google("Google Satellite",{type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22});

    map.addLayer(googleMapsLayerStreet);
    map.addLayer(googleMapsLayerSatellite);

    map.addControl(new OpenLayers.Control.LayerSwitcher());

    map.setCenter(
      centerLonLat.transform(
        olProjection,
        map.getProjectionObject()
      ),
      defaultZoomLevel
    );

    // Define the Datapoint layer bounding box
    // OpenStreetMap is based on a different coordinate system so the Lat and Lon values need to be transformed into the correct projection
    var bounds = new OpenLayers.Bounds();
    bounds.extend(new OpenLayers.LonLat(northWestBoundData).transform(olProjection, map.getProjectionObject()));
    bounds.extend(new OpenLayers.LonLat(southEastBoundData).transform(olProjection, map.getProjectionObject()));

    // Get the Datapoint image
    var layerSize = new OpenLayers.Size(widthImageData, heightImageData);

    var url_template = [
      'http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/RADAR_UK_Composite_Highres/png?TIME=',
      null,
      'Z&key=', metAPIKey];

    var times = [];
    var image_urls = [];
    var radarLayers = [];

    var loadingCapabilities =
    jQuery.ajax(
      {url: metCapabilitiesURL, dataType:'jsonp'}
    )
    .done(
      function(capabilities_json) {
        var radar = capabilities_json["Layers"]["Layer"][3];
        var radar_times = radar['Service']['Times']['Time'].reverse();
        jQuery.each(radar_times, function(index, time) {
          times.push(new Date(time));
          image_urls.push(url_template.slice());
          image_urls[index][1] = time;
          image_urls[index] = image_urls[index].join('');
          radarLayers[index] = new OpenLayers.Layer.Image(
            "Datapoint Composite Radar",
            image_urls[index],
            bounds,
            layerSize,
            {isBaseLayer: false, opacity: 0.65}
          );
          map.addLayer(radarLayers[index]);
          radarLayers[index].setVisibility(false);
        });
        radarLayers[radarLayers.length -1].setVisibility(true);
        jQuery('#info-location-time-wrapper .time').html(timeString(times[radarLayers.length - 1]));
        jQuery('#info-location-time-wrapper .date').html(dateString(times[radarLayers.length - 1]));
      }
    );

    jQuery('#button-play').on('click', function() {
      var counter = 0;
      var radarLayersLength = radarLayers.length;
      radarLayers[radarLayersLength - 1].setVisibility(false);

      var interval = setInterval(
        function() {
          var remove = counter - 1;
          if (remove<0) {
            remove = radarLayersLength-1;
          }
          radarLayers[remove].setVisibility(false);
          radarLayers[counter].setVisibility(true);
          jQuery('#info-location-time-wrapper .time').html(timeString(times[counter]));
          jQuery('#info-location-time-wrapper .date').html(dateString(times[counter]));
          if (counter === radarLayersLength-1) {
            clearInterval(interval);
          }
          else {
            counter++;
          }
        }, 300
      );
    });

    var timeString = function(input_date) {
      return [('0' + input_date.getHours()).slice(-2), ('0' + input_date.getMinutes()).slice(-2)].join(':');
    };

    var dateString = function(input_date) {
      return [input_date.getDate(), (input_date.getMonth() + 1), input_date.getFullYear()].join('.');
    };
  }
};
jQuery.ready(raindar());
