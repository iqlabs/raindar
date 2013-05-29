requirejs.config({
  paths: {
    async: '../third_party/requirejs-plugins/async',
    jQuery: '../third_party/jquery/jquery',
    OpenLayers: 'http://openlayers.org/api/OpenLayers'
  },
  shim: {
    jQuery: {
      exports: 'jQuery'
    },
    OpenLayers: {
      exports: 'OpenLayers'
    }
  }
});

define(['jQuery', 'google', 'OpenLayers', 'geocoding', 'forecastIO', 'met'], function(jQuery, google, OpenLayers, geocoding, forecastIO, met) {
  var currentLocationLatitude = 52.6675;
  var currentLocationLongitude = -8.6261;
  var currentCity = '???';
  var googleMapsLayerStreet, googleMapsLayerSatellite;
  var radarLayers = [];
  var times = [];
  var projection = 'EPSG:4326';
  var olProjection = new OpenLayers.Projection(projection);
  var map;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        currentLocationLatitude = position.coords.latitude;
        currentLocationLongitude = position.coords.longitude;
        geocoding.gettingCity(currentLocationLatitude, currentLocationLongitude).done(function (city) {
          currentCity = city;
          setUpMap();
        }).fail(function () {
          setUpMap();
        });

      },
      function(error) {
        var errors = {
          1: 'Permission denied',
          2: 'Position unavailable',
          3: 'Request timeout'
        };
        setUpMap();
      }
    );
  }
  else {
    setUpMap();
  }

  function setUpMap() {
    map = new OpenLayers.Map(
      'map',
      {
        controls: [
          new OpenLayers.Control.Navigation({
            dragPanOptions: {
                enableKinetic: true
            }
          }),
          new OpenLayers.Control.Zoom(
            {
              zoomInId: 'buttonZoomIn',
              zoomOutId: 'buttonZoomOut'
            }
          )
        ]
      }
    );

    googleMapsLayerStreet = new OpenLayers.Layer.Google("Google Streets",{numZoomLevels: 20});
    googleMapsLayerSatellite = new OpenLayers.Layer.Google("Google Hybrid",{type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22, visibility: false});

    map.addLayer(googleMapsLayerStreet);
    map.addLayer(googleMapsLayerSatellite);

    bindEvents();

    refreshData();
  }

  function refreshData() {
    var centerCoordinates = [currentLocationLongitude, currentLocationLatitude];
    var defaultZoomLevel = 7;

    var centerLonLat = new OpenLayers.LonLat(centerCoordinates);

    map.setCenter(
      centerLonLat.transform(
        olProjection,
        map.getProjectionObject()
      ),
      defaultZoomLevel
    );

    forecastIO.gettingCurrentWeather(currentLocationLatitude, currentLocationLongitude).done(function(weather) {
      var availableIcons = [
        'clear-day',
        'clear-night',
        'cloudy',
        'fog',
        'partly-cloudy-day',
        'partly-cloudy-night',
        'rain',
        'sleet',
        'snow',
        'wind'
      ];
      var windBearing = typeof weather.windBearing !== 'undefined' ? parseInt(weather.windBearing, 10) : 0;
      var windSpeed = typeof weather.windSpeed !== 'undefined' ? parseInt(weather.windSpeed, 10) : '?';
      var weatherIcon = typeof weather.icon !== 'undefined' ? weather.icon : 'unknown';
      if (jQuery.inArray(weatherIcon, availableIcons) === -1) {
        weatherIcon = 'unknown';
      }
      var temperature = typeof weather.temperature !== 'undefined' ? parseInt(weather.temperature, 10) : '?';

      // windBearing from forecast.io is the direction where the wind is coming from, so substract 180 degrees
      jQuery('#info-location-time-wrapper .location').html(currentCity);
      weather.windBearing = weather.windBearing - 180;
      jQuery('#info-wind-speed').animate({ left: 0, top: 0 }, {
        step: function(now, fx) {
          jQuery(this).css('transform','rotate('+(fx.pos * weather.windBearing)+'deg)');
        },
        duration: 1000
      });
      jQuery('.info-wind-speed-text').html(windSpeed + ' km/h');
      jQuery('#info-weather').css('background-image', 'url(assets/weather-' + weatherIcon + '.png)');
      jQuery('.info-temperature-text').html(temperature + ' &deg;C');
    });

    // Based on example found on https://metoffice-datapoint.googlegroups.com/attach/808f7dc2715d62d7/datapoint_openlayers_example.html?gda=pIdDQ0cAAACewIa7WbYlR83d2hhWhZ6AzmKI5fq-fBVOEpWlD-o5cNAOdB2eqa_XwbgIC4Yv-ZQbQwFxJw55cVwemAxM-EWmeV4duv6pDMGhhhZdjQlNAw&view=1&part=4
    var northWestBoundData = [-12.0, 48.0];
    var southEastBoundData = [5.0, 61.0];
    var widthImageData = 500;
    var heightImageData = 500;

    // Define the Datapoint layer bounding box
    // OpenStreetMap is based on a different coordinate system so the Lat and Lon values need to be transformed into the correct projection
    var bounds = new OpenLayers.Bounds();
    bounds.extend(new OpenLayers.LonLat(northWestBoundData).transform(olProjection, map.getProjectionObject()));
    bounds.extend(new OpenLayers.LonLat(southEastBoundData).transform(olProjection, map.getProjectionObject()));

    // Get the Datapoint image
    var layerSize = new OpenLayers.Size(widthImageData, heightImageData);

    met.gettingURLsAndTimes().done(function(data) {
      times = data.times;
      jQuery.each(radarLayers, function(index, layer) {
        map.removeLayer(radarLayers[index]);
      });
      radarLayers = [];
      jQuery.each(data.images_urls, function(index, url) {
        radarLayers[index] = new OpenLayers.Layer.Image(
          "Datapoint Composite Radar",
          url,
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
    });
  }

  function bindEvents() {
    jQuery('a.button-zoom-in').on('mousedown', function() {
      jQuery(this).parent().removeClass('out').addClass('in');
    });

    jQuery('a.button-zoom-in').on('mouseup', function() {
      jQuery(this).parent().removeClass('out').removeClass('in');
    });

    jQuery('a.button-zoom-out').on('mousedown', function() {
      jQuery(this).parent().removeClass('in').addClass('out');
    });

    jQuery('a.button-zoom-out').on('mouseup', function() {
      jQuery(this).parent().removeClass('out').removeClass('in');
    });

    jQuery('a.button-to-map').on('click', function() {
      var wrapper = jQuery(this).parent();
      wrapper.removeClass('satellite');
      wrapper.addClass('map');
      googleMapsLayerStreet.setVisibility(true);
      googleMapsLayerSatellite.setVisibility(false);
    });

    jQuery('a.button-to-satellite').on('click', function() {
      var wrapper = jQuery(this).parent();
      wrapper.removeClass('map');
      wrapper.addClass('satellite');
      googleMapsLayerSatellite.setVisibility(true);
      googleMapsLayerStreet.setVisibility(false);
    });

    jQuery('#button-play').on('click', function() {
      jQuery(this).attr('disabled', 'disabled');
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
            jQuery(this).removeAttr('disabled');
            clearInterval(interval);
          }
          else {
            counter++;
          }
        }, 300
      );
    });

    jQuery('#button-refresh-data').on('click', function() {
      refreshData();
    });
  }

  function timeString(input_date) {
    return [('0' + input_date.getHours()).slice(-2), ('0' + input_date.getMinutes()).slice(-2)].join(':');
  }

  function dateString(input_date) {
    return [input_date.getDate(), (input_date.getMonth() + 1), input_date.getFullYear()].join('.');
  }

});
