//var iSocket = ;
var express = require('express');
var fs = require('fs');
var cors = require('cors'); // "Request" library
var ECT = require('ect');
var busboi = require('connect-busboy');

var DESTINATION = '/Users/samelie/Dropbox/Max/_presentation/assets/video/'

var ectRenderer = ECT({
	watch: true,
	root: __dirname + '/views',
	ext: '.ect'
});

var EXPRESS = (function() {
	var Youtube = undefined;

	var server;
	var app = express();
	var io;

	app.use(cors({
		allowedOrigins: [
			'localhost',
			'app://',
			'app'
		]
	}));

	app.use(busboi());

	app.set('view engine', 'ect');
	app.engine('ect', ectRenderer.render);

	server = app.listen(3000);
	//start socket
	//io = iSocket(server);
	io = require('./socket/socket')(server);

	app.get('/', function(req, res) {
		res.render('file-upload');
	});

	app.get('/progress', function(req, res) {
		res.render('progress');
	});

	app.get('/control', function(req, res) {
		res.render('control');
	});

	app.get('/admin', function(req, res) {
		res.render('admin');
	});

	/*-------------------*/
	//POST
	/*-------------------*/

	app.post('/fileupload', function(req, res) {
		var fstream;
		req.pipe(req.busboy);
		req.busboy.on('file', function(fieldname, file, filename) {
			console.log("Uploading: " + filename);
			filename = filename.toLowerCase();
			//Path where image will be uploaded
			fstream = fs.createWriteStream(DESTINATION + filename);
			file.pipe(fstream);
			fstream.on('close', function() {
				console.log("Upload Finished of " + filename);
				res.send({
					absolutePath: DESTINATION + filename,
					name: filename
				});
			});
		});
	});

	/*-------------------*/
	//SEND FILES
	/*-------------------*/
	app.get('/admin.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/admin.js');
	});

	app.get('/admin.css', function(req, res, next) {
		res.sendFile(__dirname + '/css/admin.css');
	});

	app.get('/bpm.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/bpm.js');
	});

	app.get('/bpm.css', function(req, res, next) {
		res.sendFile(__dirname + '/css/bpm.css');
	});

	app.get('/file-upload.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/file-upload.js');
	});

	app.get('/file-upload.css', function(req, res, next) {
		res.sendFile(__dirname + '/css/file-upload.css');
	});

	app.get('/progress.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/progress.js');
	});

	app.get('/progress.css', function(req, res, next) {
		res.sendFile(__dirname + '/css/progress.css');
	});

	app.get('/control.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/control.js');
	});

	app.get('/control.css', function(req, res, next) {
		res.sendFile(__dirname + '/css/control.css');
	});

	app.get('/socket.io.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/socket.io.js');
	});

	app.get('/hammer.js', function(req, res, next) {
		res.sendFile(__dirname + '/js/hammer.js');
	});

	app.get('/hammer.min.map', function(req, res, next) {
		res.sendFile(__dirname + '/js/hammer.min.map');
	});

	console.log('Listening on port 3000');

	function setYoutube(yt) {
		Youtube = yt;
	}

	function broadcastMessage (msg) {
		io.broadcastMessage(msg);
	}

	function redirectControls(){
		io.redirectControls();
	}

	return {
		setYoutube: setYoutube,
		broadcastMessage:broadcastMessage,
		redirectControls:redirectControls
	}

})();

module.exports = EXPRESS;
/*
function ExpressServer(NodeServer) {

}

ExpressServer.prototype.playlist = undefined;

module.exports = ExpressServer;*/