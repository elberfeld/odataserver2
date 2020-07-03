// imports
// ========

var ConnectLight = require('connectlight');
var ODServerMysql = require('./odservermysql.js');
var OdParser = require('odparser').OdParser;
var OdAcl = require('odacl');
var basicAuth = require('connectbasicauth');


// Setup logging
// =============

var log = console.log.bind(console);
var info = console.info.bind(console, 'INFO');
var error = console.error.bind(console, 'ERROR');

var DEV_MODE = true;
var debug;
if (DEV_MODE) {
  debug = console.log.bind(console, 'DEBUG');
} else {
  debug = function () {};
}

// Setup Odata Server Modules
// ==========================

var mws = new ConnectLight();
var odsMysql = new ODServerMysql();

// Allow CORS
mws.use( function(req, res, next) {

  if (req.headers['origin']) {
    var origin = req.headers['origin'];
    debug('CORS headers set. Allowing the clients origin: ' + origin);

    res.setHeader('Access-Control-Allow-Origin', origin);

    res.setHeader('Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, ' +
      'user, password');

    res.setHeader('Access-Control-Expose-Headers', 'ETag'); 
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  }

  // The response to `OPTIONS` requests is always the same empty message
  if (req.method == 'OPTIONS') {
    res.end();
  }

  next();
});

mws.use('/help', function (req, res, next) {
  var path = require('path');
  var fs = require('fs');
  var dir = path.join(path.dirname(fs.realpathSync(__filename)), './');

  var fileStream = fs.createReadStream(dir + 'Usage.md');
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  fileStream.on('end', function () {
    res.end();
  });

  fileStream.pipe(res);
});

mws.use('/help2', function (req, res, next) {
  var path = require('path');
  var fs = require('fs');
  var dir = path.join(path.dirname(fs.realpathSync(__filename)), './');

  var fileStream = fs.createReadStream(dir + 'Usage2.md');
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  });

  fileStream.on('end', function () {
    res.end();
  });

  fileStream.pipe(res);
});

mws.use(OdParser.handleRequest);

var handleError = function (req, res, next, err) {
  res.writeHead(406, {
    "Content-Type": "application/json"
  });
  res.write(JSON.stringify({
    err: err
  }));
  error(err);
  //next();
  res.end();
};

mws.use(function (req, res, next) {

  var contentLength = parseInt(req.headers['content-length']);
  contentLength = (!isNaN(contentLength)) ? contentLength : 0;
  log('processing request: ', req.url, ' content length: ' + contentLength);

  if (!req.ast) handleError(req, res, next, 'Unknown operation: ' + req.url);
  else {
    debug(req.ast);
    next();
  }
});

mws.use(basicAuth);

mws.use(odsMysql.handleRequest());

var acl = new OdAcl('perms', {
  host: process.env.DB_HOST,
  parseChar: '$',
  connectFromHost: (process.env.DB_HOST === 'localhost') ? 'localhost' : '%'
}, handleError);
mws.use(acl.handleRequest());

mws.listen(3000);

process.on('SIGINT', function () {
  log("Caught interrupt signal");
  mws.close();
  setTimeout(process.exit, 1000);
});

process.on('exit', function (code) {
  log('About to exit with code:', code);
});

process.on('uncaughtException', function (code) {
  error('uncaughtException error:', code);
  /*mws.close(function(){
    mws.listen(3000);
  });*/
});

log('server running on port 3000');
