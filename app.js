var net = require('net');
var emitter = require('events').EventEmitter;
var Tail = require('tail').Tail;
var DateFormat = require('dateformatjs').DateFormat

var df = new DateFormat("yyyy' 'MMM' 'd' 'HH':'mm':'ss' 'zzz'");
var isoDate = new DateFormat("yyyy'-'MM'-'dd' 'HH':'mm':'ss.fff' 'zzz");


var logger = new emitter();

// a list of things we want to grab from the heroku router log
var stats = {
  'method': /^(GET|POST|PUT|DELETE|HEAD|OPTIONS)/,
  'app': / ([^\/ ]+)/,
  'path': /(\/[^ ]{0,})/,
  'dyno': /dyno=([^\s]+)/,
  'service': /service=([\d]+)ms/,
  'wait':  /wait=([\d]+)ms/,
  'queue': /queue=([\d]+)/,
  'status': /status=([\d+])/,
  'bytes': /bytes=([\d]+)/
};

// cast some things based on their key
function cast(key, value){
  var integers = ['service', 'wait', 'queue', 'status', 'bytes'];
  if(integers.indexOf(key) != -1){
    return parseInt(value, 10);
  }
  else{
    return value;
  }
}

// handle syslog heroku router entries
logger.on('router', function(entry){
  var metrics = {};
  console.log(entry);
  Object.keys(stats).forEach(function(key) {
    metrics[key] = cast(key, entry.message.match(stats[key])[1]);
  });
  console.debug({type:'request', time: isoDate.format(entry.timestamp), data: metrics});
});

// logger.on('data', function(data, raw){
//   console.log(raw);
// });

function parse_syslog(log){
  var match = log.match(/^([a-z]{3,4}) ([0-9]{1,2}) ([0-9]{2}\:[0-9]{2}\:[0-9]{2}) ([^\s]+) ([^\s]+) (.+)$/i);
  var year = new Date().getUTCFullYear();
  if(match){
    var syslog = {
      timestamp: df.parse(year + ' ' + match[1] + ' ' + match[2] + ' ' + match[3] + ' +0000'),
      tag: match[4],
      process: match[5],
      message: match[6]
    };
    logger.emit('data', syslog, log);
    var pmatch;
    if( (pmatch = syslog.process.match(/heroku\[(.+)\]/)) ){
      logger.emit(pmatch[1], syslog);
    }
    else if((pmatch = syslog.process.match(/app\[([^\.]+)\]/))){
      logger.emit(pmatch[1], syslog);
    }
  }
  else{
    console.log('NO MATCH: ', log);
  }
}

tail = new Tail("/var/log/heroku.log");
tail.on("line", parse_syslog);
