var _ = require('lodash');
var io = require('socket.io');
var Youtube = require('../youtube/youtube');
//var TIME = 90000;
var TIME = 3000;

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

	function onSocketKeywordUpvote(term){
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
		var inter = setInterval(function(){
			timeRemaining-=10;
			if(timeRemaining < 0){
				clearInterval(inter);
				Youtube.parseKeywords(keywords, users);
				io.emit('socket:redirect:progress');
			}
			io.emit("socket:update:time", (timeRemaining / 1000).toFixed(3));
		}, 10);
	}

	function userConnected(socket) {
		users[socket.id] = socket;

		//USER
		users[socket.id].on('socket:bpm', onSocketBpm);
		users[socket.id].on('socket:keyword', onSocketKeyword);
		users[socket.id].on('socket:keyword:upvote', onSocketKeywordUpvote);
		users[socket.id].on('socket:video', onSocketVideo);

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

	return {
		broadcastMessage: broadcastMessage
	}

};

module.exports = SOCKET;