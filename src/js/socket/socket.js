var _ = require('lodash');
var io = require('socket.io');
var Youtube = require('../youtube/youtube');
var MAX = require('../max');
//var TIME = 90000;
var TIME = 3000;

var CONTROLS = [
	["user/v1_con", "contrast"],
	["user/v1_bri", "brightness"],
	["user/v1_sat", "saturation"],
	["user/v1_hue", "hue"],
	["user/v2_con", "contrast"],
	["user/v2_bri", "brightness"],
	["user/v2_sat", "saturation"],
	["user/v2_hue", "hue"],
	["user/v1_tolerance", "chroma tolerance"],
	["user/v1_slope", "chroma slope"],
	["user/v1_echo", "echo"],
	["user/v1_fadein", "fade in"],
	["user/chroma_red", "chroma red"],
	["user/chroma_blue", "chroma blue"],
	["user/chroma_green", "chroma green"],
	["user/v1_position", "depth"],
	["user/v1_delay", "delay"],
	["user/v1_xfade", "fade between"],
	["user/v1_rotation", "rotation"],
	["user/v1_offsetx", "v1_offsetx"],
	["user/v1_offsety", "v1_offsety"],
	["user/v1_scalex", "scale x"],
	["user/v1_scaley", "scale y"]
];
var CONTROL_INDEX = 0;

var SOCKET = function(expressServer) {
	var NodeServer = undefined;
	var adminId = undefined;
	var users = {};
	var keywords = {};
	io = io.listen(expressServer);

	/*---------------*/
	//SOCKET
	/*---------------*/
	io.on('connection', userConnected);

	/*WHEN THE USER FIRST CONNECTS*/
	//--------
	//USER
	//--------
	function onSocketBpm(data) {
		console.log("Changed bpm:", data);
		//in milliseconds
		nodeServer.max.bpm(data);
	}

	function onSocketKeyword(data) {
		var user = users[this.id];
		user['inputData'] = data['keyword'];
		user['type'] = 'keyword';
		keywords[data['keyword']] = keywords[data['keyword']] || {
			votes: 0
		};
		io.emit('socket:update:keywords', keywords);
	}

	function onSocketVideo(data) {
		var user = users[this.id];
		user['inputData'] = data['data'];
		user['type'] = 'video';
		/*updateAdmin({
			id: this.id,
			data: user['inputData']
		});*/
	}

	function onSocketKeywordUpvote(term) {
		keywords[term].votes++;
		io.emit('socket:update:keywords', keywords);
	}


	//--------
	//ADMIN
	//--------
	function onAdminConnected(data) {
		adminId = data['id'];
		users[data.id]['admin'] = true;
		console.log("Admin Connected: ", data.id);
	}

	function updateAdmin(data) {
		users[adminId].emit('socket:update', data);
	}

	function onAdminGo() {
		var timeRemaining = TIME;
		var inter = setInterval(function() {
			timeRemaining -= 10;
			if (timeRemaining < 0) {
				clearInterval(inter);
				Youtube.makeVideo(keywords, users);
				io.emit('socket:redirect:progress');
			}
			io.emit("socket:update:time", Math.max((timeRemaining / 1000).toFixed(3), 0));
		}, 10);
	}

	function onControlConnected(id) {
		var index = CONTROL_INDEX % CONTROLS.length;
		users[id].emit('socket:control:set', {
			msg: CONTROLS[index][0],
			name: CONTROLS[index][1]
		});
		CONTROL_INDEX++;
	}

	function onControlEmitted(data) {
		console.log(data);
		MAX.emit(data.msg, data.val);
	}

	function userConnected(socket) {
		users[socket.id] = socket;

		//USER
		users[socket.id].on('socket:bpm', onSocketBpm);
		users[socket.id].on('socket:keyword', onSocketKeyword);
		users[socket.id].on('socket:keyword:upvote', onSocketKeywordUpvote);
		users[socket.id].on('socket:video', onSocketVideo);

		users[socket.id].on('socket:control:handshake', onControlConnected);
		users[socket.id].on('socket:control:emit', onControlEmitted);

		//ADMIN
		users[socket.id].on('admin:connected', onAdminConnected);
		users[socket.id].on('admin:go', onAdminGo);

		users[socket.id].emit('handshake', {
			id: users[socket.id].id
		});

		users[socket.id].on('disconnect', function() {
			delete users[socket.id];
			console.log(socket.id, "disconnected!");
		});

		console.log(users[socket.id]['id'], "connected!");
	}

	function onPlaylistStarted() {
		if (!adminId) {
			return;
		}
		users[adminId].emit('playlist:started');
	}

	//-----------------
	//PUBLIC
	//-----------------

	function emitAdmin(message, data) {
		if (!users[adminId]) {
			return;
		}
		users[adminId].emit(message, data);
	}

	function broadcastMessage(msg) {
		io.emit('socket:video:complete', msg);
	}

	function redirectControls() {
		io.emit('socket:redirect:controls');
	}

	return {
		broadcastMessage: broadcastMessage,
		redirectControls: redirectControls
	}

};

module.exports = SOCKET;