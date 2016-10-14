'use strict';

var http = require('http');
var https = require('https');

var port = process.env.PORT || 9800;
var forecastIOKey = 'PUT_FORECAST_IO_API_KEY_HERE';
var cachedForecasts = {};

var cityToLatLon = {
  'betim': '-19.928789,-44.160160',
  'gdansk': '54.392774,18.570510'
  
};

function handleRequest(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  var cityName = request.url.substring(1).replace('.json', '');
  var cityCoords = cityToLatLon[cityName];
  if (!cityCoords) {
    response.statusCode = 404;
    response.end();
    console.log('404  ', request.url);
    return;
  }
  console.log('REQ  ', request.url);
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('X-Powered-By', 'fIO.proxy');
  var cachedForecast = cachedForecasts[cityName];
  if (cachedForecast && Date.now() < cachedForecast.expiresAt) {
    response.end(JSON.stringify(cachedForecast));
    console.log('RESP ', cityName, '[cache]');
  } else {
    getForecast(cityCoords, function(freshForecast) {
      response.end(freshForecast);
      var forecast = JSON.parse(freshForecast);
      forecast.expiresAt = Date.now() + (1000 * 60);
      cachedForecasts[cityName] = forecast; 
      console.log('RESP ', cityName, '[network]');     
    });
  }
}

function getForecast(coords, callback) {
  var options = {
    host: 'api.darksky.net',
    path: '/forecast/e22bcd76c131550e15aa6fe4f79c1257/' + coords
  };
  https.request(options, function(response) {
    var resp = '';
    response.on('data', function(chunk) {
      resp += chunk;
    });
    response.on('end', function() {
      if (callback) {
        callback(resp);
      }
    });
  }).end();
}

var httpServer = http.createServer(handleRequest);

httpServer.listen(port, function() {
  console.log('Forecast.io proxy server started...', port);
});
