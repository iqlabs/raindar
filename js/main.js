requirejs.config({
  paths: {
    async: '../third_party/requirejs-plugins/async',
    jQuery: '../third_party/jquery/jquery',
    OpenLayers: 'http://openlayers.org/api/OpenLayers',
    raindarJS: 'raindar'
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
var rain = rain || {};

define(['jQuery', 'google', 'OpenLayers', 'raindarJS', 'geocoding', 'forecastIO', 'met'], function(jQuery, google, OpenLayers, raindarJS, geocoding, forecastIO, met) {

    raindarJS.init();

});
