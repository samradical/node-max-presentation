var Q = require('q');
var hosturl = "0.0.0.0";
var wsport = 3100;
var oscport = 8000;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({
	host: hosturl,
	port: wsport
});
var oscsender = require('omgosc').UdpSender;
var sender = new oscsender(hosturl, oscport);

//readFirst
//readSecond

var MAX_SENDER = {
	readFirst:function(path){
		console.log(path);
		sender.send('admin/readFirst', 's', [path]);
	},
	readSecond:function(path){
		console.log(path);
		sender.send('admin/readSecond', 's', [path]);
	},
	emit:function(msg, val){
		sender.send(msg, 'f', [val]);
	}
};

module.exports = MAX_SENDER;