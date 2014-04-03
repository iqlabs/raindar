requirejs.config({
  paths: {
    async: '../third_party/requirejs-plugins/async',
    jQuery: '../third_party/jquery/jquery'
  },
  shim: {
    jQuery: {
      exports: 'jQuery'
    }
  }
});

define(['jQuery', 'google', 'geocoding', 'forecastIO', 'met'], function(jQuery, google, geocoding, forecastIO, met) {
    "use strict";

    var raindar = {
        currentLocationLatitude : 52.6675, // TODO : move appropriate properties to config file
        currentLocationLongitude : -8.6261,
        currentCity: 'City',
        layerAnimationCounter : 0,
        radarLayers: [],
        map: {},
        olProjection: {},
        times : [],
        googleMapsLayerStreet : null,
        googleMapsLayerSatellite : null,
        layerAnimationInterval:null,
        start : function () {
            this.gettingCurrentLocation().always(this.reverseGeocodeAndSetUpMap);
        },
        gettingCurrentLocation : function () {
            var deferred = jQuery.Deferred();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        raindar.currentLocationLatitude = position.coords.latitude;
                        raindar.currentLocationLongitude = position.coords.longitude;
                        deferred.resolve();
                    },
                    function(error) {
                        var errors = {
                            1: 'Permission denied',
                            2: 'Position unavailable',
                            3: 'Request timeout'
                        };
                        deferred.reject(error);
                    }
                );
            }
            else {
                deferred.reject();
            }
            return deferred.promise();
        },
        reverseGeocodeAndSetUpMap : function () {
            geocoding.gettingCity(raindar.currentLocationLatitude, raindar.currentLocationLongitude)
                .done(function(city) {
                    raindar.currentCity = city;
                })
                .always(raindar.setUpMap);
        },
        setUpMap : function () {

//            var googleMapsLayerStreet, googleMapsLayerSatellite;
//            var radarLayers = [];
            var projection = 'EPSG:4326';
            raindar.olProjection = new OpenLayers.Projection(projection);
//            var layerAnimationInterval;
//            var layerAnimationCounter = 0;
            raindar.map = new OpenLayers.Map(
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
                });
            raindar.googleMapsLayerStreet = new OpenLayers.Layer.Google("Google Streets",{numZoomLevels: 20});
            raindar.googleMapsLayerSatellite = new OpenLayers.Layer.Google("Google Hybrid",{type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22, visibility: false});

            raindar.map.addLayer(raindar.googleMapsLayerStreet);
            raindar.map.addLayer(raindar.googleMapsLayerSatellite);

            var markers = new OpenLayers.Layer.Markers("Markers");
            var size = new OpenLayers.Size(21,25);
            var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
            var icon = new OpenLayers.Icon('assets/location-icon.png',size,offset);
            markers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(raindar.currentLocationLongitude, raindar.currentLocationLatitude).transform(raindar.olProjection, raindar.map.getProjectionObject()),icon));
            raindar.map.addLayer(markers);

            raindar.bindEvents();

            raindar.refreshData();
        },
        refreshData : function () {
            
            var centerCoordinates = [raindar.currentLocationLongitude, raindar.currentLocationLatitude];
            var defaultZoomLevel = 8;
            var centerLonLat = new OpenLayers.LonLat(centerCoordinates);

            raindar.map.setCenter(
                centerLonLat.transform(
                    raindar.olProjection,
                    raindar.map.getProjectionObject()
                ),
                defaultZoomLevel
            );

            forecastIO.gettingCurrentWeather(raindar.currentLocationLatitude, raindar.currentLocationLongitude).done(function(weather) {
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
                jQuery('#info-location-time-wrapper .location').html(raindar.currentCity);
                weather.windBearing = weather.windBearing - 90;
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
            bounds.extend(new OpenLayers.LonLat(northWestBoundData).transform(raindar.olProjection, raindar.map.getProjectionObject()));
            bounds.extend(new OpenLayers.LonLat(southEastBoundData).transform(raindar.olProjection, raindar.map.getProjectionObject()));

            // Get the Datapoint image
            var layerSize = new OpenLayers.Size(widthImageData, heightImageData);

            met.gettingURLsAndTimes().done(function(data) {
                raindar.times = data.times;
                jQuery.each(raindar.radarLayers, function(index, layer) {
                    raindar.map.removeLayer(raindar.radarLayers[index]);
                });
                raindar.radarLayers = [];
                jQuery.each(data.images_urls, function(index, url) {
                    raindar.radarLayers[index] = new OpenLayers.Layer.Image(
                        "Datapoint Composite Radar",
                        url,
                        bounds,
                        layerSize,
                        {isBaseLayer: false, opacity: 0.65}
                    );
                    raindar.map.addLayer(raindar.radarLayers[index]);
                    raindar.radarLayers[index].setVisibility(false);
                });
                raindar.radarLayers[raindar.radarLayers.length -1].setVisibility(true);
                raindar.layerAnimationCounter = raindar.radarLayers.length - 1;
                jQuery('#info-location-time-wrapper .time').html(raindar.timeString(raindar.times[raindar.radarLayers.length - 1]));
                jQuery('#info-location-time-wrapper .date').html(raindar.dateString(raindar.times[raindar.radarLayers.length - 1]));
            });
        },
        bindEvents : function () {
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
                raindar.googleMapsLayerStreet.setVisibility(true);
                raindar.googleMapsLayerSatellite.setVisibility(false);
            });

            jQuery('a.button-to-satellite').on('click', function() {
                var wrapper = jQuery(this).parent();
                wrapper.removeClass('map');
                wrapper.addClass('satellite');
                raindar.googleMapsLayerSatellite.setVisibility(true);
                raindar.googleMapsLayerStreet.setVisibility(false);
            });

            jQuery('#button-about').on('click', function() {
                jQuery('#about-screen, #about-screen-mask').show();
            });

            jQuery('#button-play').on('click', function() {
                var $play_button = jQuery(this);
                if ($play_button.hasClass('playing')) {
                    $play_button.removeClass('playing');
                    clearInterval(raindar.layerAnimationInterval);
                    return false;
                }
                $play_button.addClass('playing');

                var layersNumber = raindar.radarLayers.length - 1;

                raindar.layerAnimationInterval = setInterval(
                    function() {
                        var isCurrentFrameLast = (raindar.layerAnimationCounter === layersNumber);
                        var nextLayer = isCurrentFrameLast ? 0 : raindar.layerAnimationCounter + 1;
                        raindar.radarLayers[raindar.layerAnimationCounter].setVisibility(false);
                        raindar.radarLayers[nextLayer].setVisibility(true);
                        jQuery('#info-location-time-wrapper .time').html(raindar.timeString(raindar.times[nextLayer]));
                        jQuery('#info-location-time-wrapper .date').html(raindar.dateString(raindar.times[nextLayer]));
                        raindar.layerAnimationCounter = nextLayer;
                        if (raindar.layerAnimationCounter === layersNumber) {
                            if ($play_button.hasClass('playing')) {
                                jQuery('#button-play').trigger('click');
                            }
                        }
                    }, 300
                );
            });

            jQuery('#button-refresh-data').on('click', function() {
                raindar.refreshData();
            });

            jQuery('#about-screen .close').on('click', function() {
                jQuery('#about-screen, #about-screen-mask').hide();
            });
        },
        timeString : function (input_date) {
            return [('0' + input_date.getHours()).slice(-2), ('0' + input_date.getMinutes()).slice(-2)].join(':');
        },
        dateString : function (input_date) {
            return [input_date.getDate(), (input_date.getMonth() + 1), input_date.getFullYear()].join('.');

        }
    };
    return raindar;
});