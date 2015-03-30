function ADMIN() {
	var mainEl;
	var goEl;
	var ids = [];
	var els = {};

	var socket = io('http://192.168.10.23');
	var socketId = "user_" + Math.floor(Math.random() * 1000);
	function _onTap(e) {
		inputEl.click();
	}

	function _onGo(e){
		console.log('sdsd');
		socket.emit('admin:go');
	}

	function _fileSelected(e) {
		var file = inputEl.files[0];

		var filename = file.name.substring(0, file.name.length - 4);
		var ext = file.name.substring(file.name.length - 4, file.name.length).toLowerCase();
		var formData = new FormData();
		console.log(socketId);
		filename = socketId + ext;
		formData.append('photos[]', file, filename);

		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/fileupload', true);
		xhr.addEventListener('readystatechange', function(e) {
			if (this.readyState === 4) {
				var res = JSON.parse(e.target.response);
				console.log(res);
				socket.emit('socket:video', {
					data: res
				});
			}
		});

		xhr.send(formData);
	}

	function init() {
		mainEl  = document.querySelector('.Admin');
		goEl  = document.querySelector('.Submit');
		goEl.addEventListener('touchstart', _onGo);
		inputEl = document.getElementById('fileInput');
		inputEl.addEventListener('change', _fileSelected);
		var tapEl = document.querySelector('.FileUpload');
		tapEl.addEventListener('click', _onTap);
	}

	function update(data){
		if(ids.indexOf(data['id']) === -1){
			var el  = document.createElement('div');
			el.classList.add('UserResponse');
			mainEl.appendChild(el);

			var typeEl  = document.createElement('span');
			typeEl.classList.add('UserResponse-text');
			el.appendChild(typeEl);
			els[data['id']] = typeEl;
			ids.push(data['id']);
		}
		els[data['id']].innerHTML = data['data']['name'] || data['data'];
	}

	socket.on('handshake', function(data) {
		console.log(data.id);
		socket.emit('admin:connected', data);
	});

	socket.on('socket:update', function(data) {
		update(data);
	});

	socket.on('socket:redirect:controls', function(data) {

	});

	window.addEventListener("load", init);
}



var admin = new ADMIN();