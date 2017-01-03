// convert Google Maps into an AMD module, thanks to
// http://blog.millermedeiros.com/requirejs-2-0-delayed-module-evaluation-and-google-maps/
define('google', ['async!http://maps.google.com/maps/api/js?v=3.12&sensor=false'],
function() {
    return window.google;
});
