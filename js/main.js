requirejs.config({
  paths: {
    async: '../third_party/requirejs-plugins/async',
    jQuery: '../third_party/jquery/jquery',
    raindarJS: 'raindar'
  },
  shim: {
    jQuery: {
      exports: 'jQuery'
    }
  }
});

var Raindar = Raindar || {}; // Initialize our global namespace

define(['jQuery', 'raindar'], function(jQuery, raindar) {
    "use strict";
    Raindar.app = raindar;
    Raindar.app.start();

});
