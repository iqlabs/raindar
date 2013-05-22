var raindar = function () {
  var _raindar = this;

  // Get data from forecast.io
  var forecastIOAPIKey = '931bb054da507e4747844db62accc6a5';
  var forecastIOUrl = [
    'https://api.forecast.io/forecast',
    forecastIOAPIKey,
    null
  ];

  var latitudeForecast = 53.3428;
  var longitudeForecast = -6.2661;

  forecastIOUrl[2] = [latitudeForecast,',',longitudeForecast].join('');

  var forecastIOUrlString = forecastIOUrl.join('/') + '?units=si&exclude=daily,flags,hourly,minutely';

  var loadingForecast =
  jQuery.ajax(
    {url: forecastIOUrlString, dataType:'jsonp'}
  ).done(function(forecast_response) {
    var currentConditions = forecast_response.currently;
    var windBearing = currentConditions.windBearing;
    var windSpeed = typeof currentConditions.windSpeed !== 'undefined' ? parseInt(currentConditions.windSpeed, 10) : '?';
    var precipitationProbability = typeof currentConditions.precipProbability !== 'undefined' ? parseInt(currentConditions.precipProbability, 10) : '?';
    var temperature = typeof currentConditions.temperature !== 'undefined' ? parseInt(currentConditions.temperature, 10) : '?';

    jQuery('.info-wind-speed-text').html(windSpeed + ' km/h');
    jQuery('.info-precipitation-chance-text').html(precipitationProbability + '%');
    jQuery('.info-temperature-text').html(temperature + 'C');
  });



  // Based on example found on https://metoffice-datapoint.googlegroups.com/attach/808f7dc2715d62d7/datapoint_openlayers_example.html?gda=pIdDQ0cAAACewIa7WbYlR83d2hhWhZ6AzmKI5fq-fBVOEpWlD-o5cNAOdB2eqa_XwbgIC4Yv-ZQbQwFxJw55cVwemAxM-EWmeV4duv6pDMGhhhZdjQlNAw&view=1&part=4
  var centerCoordinates = [-7.5, 53.5];
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
        times.push(time);
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
        if (counter === radarLayersLength-1) {
          clearInterval(interval);
        }
        else {
          counter++;
        }
      }, 300
    );
  });

};
jQuery.ready(raindar());
