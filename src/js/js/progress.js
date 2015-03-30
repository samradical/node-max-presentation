function Progress() {
	var socket = io('http://localhost');
	var mainEl;

	function init() {
		mainEl = document.querySelector('.Main');
	}

	socket.on('handshake', function(data) {
		socketId = data.id;
		console.log(socketId);
	});

	socket.on('socket:redirect:controls', function(data) {
		window.location.href = "http://localhost:3000/control";
	});

	socket.on('socket:video:complete', function(data) {
		console.log(data);
		var el = document.createElement('div');
		el.classList.add('UserResponse');
		mainEl.appendChild(el);
		var vEl = document.createElement('span');
		vEl.classList.add('UserResponse-text', 'vote-text');
		el.appendChild(vEl);
		var tEl = document.createElement('span');
		tEl.classList.add('UserResponse-text', 'term-text');
		el.appendChild(tEl);
		vEl.innerHTML = "downloaded: ";
		tEl.innerHTML = data['name']
	});

	window.addEventListener("load", init);
}



var bpm = new Progress();