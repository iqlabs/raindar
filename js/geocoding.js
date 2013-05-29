define(['jQuery', 'google'], function(jQuery, google) {
  function gettingCity(latitude, longitude) {
    var deferred = new jQuery.Deferred();
    var isCityFound = false;
    var city = '';

    var google_geocoder = new google.maps.Geocoder();
    var google_latlon = new google.maps.LatLng(latitude, longitude);

    google_geocoder.geocode({'latLng': google_latlon}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        jQuery.each(results, function(index, result) {
          jQuery.each(result.types, function(index, type) {
            if (type === 'locality') {
              city = result.address_components[index].short_name;
              isCityFound = true;
              return false;
            }
          });
          if (isCityFound === true) {
            return false;
          }
        });
        if (isCityFound === true) {
          deferred.resolve(city);
        }
        else {
          deferred.reject();
        }
      }
    });
    return deferred.promise();
  }

  return {
    gettingCity: gettingCity
  };
});
