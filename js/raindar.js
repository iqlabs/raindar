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

    var Raindar = {
        currentLocationLatitude : 53.34116, // TODO : having moved variables out of the global scope, I need to move appropriate properties to config file
        currentLocationLongitude : -6.262257,
        currentCity: 'Loading...',
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

            if (localStorage.currentLocationLatitude && localStorage.currentLocationLongitude) {
                Raindar.currentLocationLatitude = localStorage.currentLocationLatitude;
                Raindar.currentLocationLongitude = localStorage.currentLocationLongitude;
                deferred.resolve();
            } else {

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        function(position) {
                            localStorage.currentLocationLatitude = position.coords.latitude;
                            localStorage.currentLocationLongitude = position.coords.longitude;
                            Raindar.currentLocationLatitude = position.coords.latitude;
                            Raindar.currentLocationLongitude = position.coords.longitude;
                            deferred.resolve();
                            return deferred.promise();
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

            }
            return deferred.promise();
        },
        reverseGeocodeAndSetUpMap : function () {
            geocoding.gettingCity(Raindar.currentLocationLatitude, Raindar.currentLocationLongitude)
                .done(function(city) {
                    Raindar.currentCity = city;
                })
                .always(Raindar.setUpMap);
        },
        setUpMap : function () {
            var projection = 'EPSG:4326';
            Raindar.olProjection = new OpenLayers.Projection(projection);

            Raindar.map = new OpenLayers.Map(
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
                        ),
                        new OpenLayers.Control.CacheWrite({
                            autoActivate: true,
                            eventListeners: {
                                cachefull: function() {console.log('cache full');
                                }
                            }
                        })
                    ]
                });
            Raindar.googleMapsLayerStreet = new OpenLayers.Layer.Google("Google Streets",{numZoomLevels: 20});
            Raindar.googleMapsLayerSatellite = new OpenLayers.Layer.Google("Google Hybrid",{type: google.maps.MapTypeId.HYBRID, numZoomLevels: 22, visibility: false});

            Raindar.map.addLayer(Raindar.googleMapsLayerStreet);
            Raindar.map.addLayer(Raindar.googleMapsLayerSatellite);

            Raindar.map.layers[0].events.on({'tileloaded': function(){console.log('tiles loaded!!!!');} });

            Raindar.bindEvents();

            Raindar.refreshData();
        },
        addMarkers : function () {

            // Remove any existing markers first
            if (Raindar.map.getLayersByClass('OpenLayers.Layer.Markers').length) {
                Raindar.map.removeLayer(Raindar.map.getLayersByClass('OpenLayers.Layer.Markers')[0]);
            }
            var markers = new OpenLayers.Layer.Markers("Markers");
            var size = new OpenLayers.Size(21,25);
            var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
            var icon = new OpenLayers.Icon('assets/location-icon.png',size,offset);
            markers.addMarker(new OpenLayers.Marker(new OpenLayers.LonLat(Raindar.currentLocationLongitude, Raindar.currentLocationLatitude).transform(Raindar.olProjection, Raindar.map.getProjectionObject()),icon));
            Raindar.map.addLayer(markers);

        },
        refreshData : function () {
            var centerCoordinates = [Raindar.currentLocationLongitude, Raindar.currentLocationLatitude];
            var defaultZoomLevel = 8;
            var centerLonLat = new OpenLayers.LonLat(centerCoordinates);

            Raindar.map.setCenter(
                centerLonLat.transform(
                    Raindar.olProjection,
                    Raindar.map.getProjectionObject()
                ),
                defaultZoomLevel
            );

            Raindar.addMarkers();

            forecastIO.gettingCurrentWeather(Raindar.currentLocationLatitude, Raindar.currentLocationLongitude).done(function(weather) {
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
                jQuery('#info-location-time-wrapper .location').html(Raindar.currentCity);
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
            bounds.extend(new OpenLayers.LonLat(northWestBoundData).transform(Raindar.olProjection, Raindar.map.getProjectionObject()));
            bounds.extend(new OpenLayers.LonLat(southEastBoundData).transform(Raindar.olProjection, Raindar.map.getProjectionObject()));

            // Get the Datapoint image
            var layerSize = new OpenLayers.Size(widthImageData, heightImageData);

            met.gettingURLsAndTimes().done(function(data) {
                Raindar.times = data.times;
                jQuery.each(Raindar.radarLayers, function(index, layer) {
                    Raindar.map.removeLayer(Raindar.radarLayers[index]);
                });
                Raindar.radarLayers = [];
                jQuery.each(data.images_urls, function(index, url) {
                    Raindar.radarLayers[index] = new OpenLayers.Layer.Image(
                        "Datapoint Composite Radar",
                        url,
                        bounds,
                        layerSize,
                        {isBaseLayer: false, opacity: 0.65}
                    );
                    Raindar.map.addLayer(Raindar.radarLayers[index]);
                    Raindar.radarLayers[index].setVisibility(false);
                });
                Raindar.radarLayers[Raindar.radarLayers.length -1].setVisibility(true);
                Raindar.layerAnimationCounter = Raindar.radarLayers.length - 1;
                jQuery('#info-location-time-wrapper .time').html(Raindar.timeString(Raindar.times[Raindar.radarLayers.length - 1]));
                jQuery('#info-location-time-wrapper .date').html(Raindar.dateString(Raindar.times[Raindar.radarLayers.length - 1]));
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
                Raindar.googleMapsLayerStreet.setVisibility(true);
                Raindar.googleMapsLayerSatellite.setVisibility(false);
            });

            jQuery('a.button-to-satellite').on('click', function() {
                var wrapper = jQuery(this).parent();
                wrapper.removeClass('map');
                wrapper.addClass('satellite');
                Raindar.googleMapsLayerSatellite.setVisibility(true);
                Raindar.googleMapsLayerStreet.setVisibility(false);
            });

            jQuery('#button-about').on('click', function() {
                jQuery('#about-screen, #about-screen-mask').show();
            });

            jQuery('#button-play').on('click', function() {
                var $play_button = jQuery(this);
                if ($play_button.hasClass('playing')) {
                    $play_button.removeClass('playing');
                    clearInterval(Raindar.layerAnimationInterval);
                    return false;
                }
                $play_button.addClass('playing');

                var layersNumber = Raindar.radarLayers.length - 1;

                Raindar.layerAnimationInterval = setInterval(
                    function() {
                        var isCurrentFrameLast = (Raindar.layerAnimationCounter === layersNumber);
                        var nextLayer = isCurrentFrameLast ? 0 : Raindar.layerAnimationCounter + 1;
                        Raindar.radarLayers[Raindar.layerAnimationCounter].setVisibility(false);
                        Raindar.radarLayers[nextLayer].setVisibility(true);
                        jQuery('#info-location-time-wrapper .time').html(Raindar.timeString(Raindar.times[nextLayer]));
                        jQuery('#info-location-time-wrapper .date').html(Raindar.dateString(Raindar.times[nextLayer]));
                        Raindar.layerAnimationCounter = nextLayer;
                        if (Raindar.layerAnimationCounter === layersNumber) {
                            if ($play_button.hasClass('playing')) {
                                jQuery('#button-play').trigger('click');
                            }
                        }
                    }, 300
                );
            });

            jQuery('#button-refresh-data, .info-location-time-text').on('click', function() {
                localStorage.clear();
                Raindar.gettingCurrentLocation().then(Raindar.refreshData);
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
    return Raindar;
});