var raindar = function () {

  //Use OpenStreetMap as the background maping layer
  var map = new OpenLayers.Map('map'),
    bounds,
    projection,
    layerSize,
    satelliteLayer,
    radarLayer;

  var gmap_street = new OpenLayers.Layer.Google("Google Streets",{numZoomLevels: 20});
  var gmap_satellite = new OpenLayers.Layer.Google("Google Satellite",{type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22});

  map.addLayer(gmap_street);
  map.addLayer(gmap_satellite);
  map.addControl(new OpenLayers.Control.LayerSwitcher());

  //Center the Map over the UK
  map.setCenter(
    new OpenLayers.LonLat(-7.5, 53.5).transform(
      new OpenLayers.Projection("EPSG:4326"),
      map.getProjectionObject()
    ),
    7
  );

  //Define the Datapoint layer bounding box
  // OpenStreetMap is based on a different coordinate system so the Lat and Lon values need to be transformed into the correct projection
  bounds = new OpenLayers.Bounds();
  projection = new OpenLayers.Projection("EPSG:4326");
  bounds.extend(new OpenLayers.LonLat(-12.0, 48.0).transform(projection, map.getProjectionObject()));
  bounds.extend(new OpenLayers.LonLat(5.0, 61.0).transform(projection, map.getProjectionObject()));

  // Get the Datapoint image
  layerSize = new OpenLayers.Size(500, 500);

  // Create the layers based on the Datapoint Image URLs, the bounding box and the Image size (500px x 500px)
  // The application should first identify the available images by parsing the contents of the capabilities document
  // for Rainfall Radar this would be the http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/all/xml/capabilities?key=<API key>
  // This is a static example image as used in the documentation

  var api_key = "c1d1b645-d1c4-4883-bfb4-2adb3c346f80";
  var capabilities_url = "http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/all/json/capabilities?key=" + api_key;

  var url_template = [
    'http://datapoint.metoffice.gov.uk/public/data/layer/wxobs/RADAR_UK_Composite_Highres/png?TIME=',
    null,
    'Z&key=c1d1b645-d1c4-4883-bfb4-2adb3c346f80'];

  var times = [];
  var image_urls = [];
  var radarLayers = [];

  var loadingCapabilities =
  jQuery.ajax(
    {url: capabilities_url, dataType:'jsonp'}
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
          {isBaseLayer: false}
        );
      });
  // Add the image layers to the map
  /*map.addLayer(radarLayer);*/
  var counter = 0;
  var length = radarLayers.length;
  var interval = setInterval(
    function() {
      var remove = counter - 1;
      if (remove<0) {
        remove = radarLayers.length-1;
      }
      try {
        map.removeLayer(radarLayers[remove]);
      }
      catch(e) {}
      map.addLayer(radarLayers[counter]);
      //jQuery('span.time').html(times[counter]);
      if (counter === radarLayers.length-1) {
        clearInterval(interval);
      }
      else {
        counter++;
      }
    }
  ,300)

    }
  );

  /*radarLayer = new OpenLayers.Layer.Image(
    "Datapoint Composite Radar",
    "http://www.metoffice.gov.uk/media/image/h/o/Radar_Composite.png",
    bounds,
    layerSize,
    {isBaseLayer: false}
  );*/


};
jQuery.ready(raindar());
