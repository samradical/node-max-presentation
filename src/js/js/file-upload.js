function FileUpload() {
	var PHRASE = "TYPE SEARCH PHRASE";
	var timerEl;
	var keyEl;
	var screenEl;
	var resEl;
	var inputEl;
	var keywords = [];
	var els = {};
	var socket = io('http://192.168.10.23');
	var socketId = "user_" + Math.floor(Math.random() * 1000);
	var uploadCount = 0;

	function _onTap(e) {
		inputEl.click();
	}

	function _onFocusIn(e) {
		if (e.target.value === PHRASE) {
			e.target.value = "";
		}
	}

	function _onFocusOut(e) {
		if (e.target.value === "") {
			e.target.value = PHRASE;
		}
	}

	function _onFormSub(e) {
		e.preventDefault();
		//var keyword = keyEl.value.split(" ")[0];
		var keyword = keyEl.value;
		keyEl.value = "";
		/*socket.emit('socket:keyword', {
			keyword: keyword
		});*/
		socket.emit('socket:keyword', {
			keyword: keyword
		});
	}

	function _fileSelected(e) {
		var file = inputEl.files[0];

		var filename = file.name.substring(0, file.name.length - 4);
		var ext = file.name.substring(file.name.length - 4, file.name.length).toLowerCase();
		var formData = new FormData();
		filename = socketId.substring(0, 5) + "_" + uploadCount + ext;
		formData.append('photos[]', file, filename);

		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/fileupload', true);
		xhr.addEventListener('readystatechange', function(e) {
			if (this.readyState === 4) {
				uploadCount++;
				var res = JSON.parse(e.target.response);
				console.log(res);
				socket.emit('socket:video', {
					data: res
				});
			}
		});

		xhr.send(formData);
	}

	function _onTermUpVote(e){
		socket.emit('socket:keyword:upvote', e.target.value);
	}

	function update(data) {
		for (var term in data) {
			//new
			if (keywords.indexOf(term) === -1) {
				els[term] = {};
				var el = document.createElement('div');
				el.value = term;
				el.classList.add('UserResponse');
				//el.addEventListener('click', _onTermUpVote);
				el.addEventListener('touchstart', _onTermUpVote);
				resEl.appendChild(el);

				var tEl = document.createElement('span');
				tEl.classList.add('UserResponse-text', 'term-text');
				el.appendChild(tEl);
				var iEl = document.createElement('span');
				iEl.classList.add('UserResponse-text', 'instrc-text');
				el.appendChild(iEl);
				var vEl = document.createElement('span');
				vEl.classList.add('UserResponse-text',  'vote-text');
				el.appendChild(vEl);
				var statEl = document.createElement('div');
				statEl.classList.add('UserResponse-text',  'stats-text');
				el.appendChild(statEl);
				els[term]['tEl'] = tEl;
				els[term]['iEl'] = iEl;
				els[term]['vEl'] = vEl;
				els[term]['statEl'] = statEl;
				keywords.push(term);
			}
			els[term]['tEl'].innerHTML = term;
			els[term]['iEl'].innerHTML = " : search term || votes : ";
			els[term]['vEl'].innerHTML = data[term]['votes'];
			els[term]['statEl'].innerHTML = "(tap to ^vote)";
		}
	}

	function init() {
		timerEl = document.querySelector('.Timer');
		screenEl = document.getElementById('fileUpload');
		inputEl = document.getElementById('fileInput');
		inputEl.addEventListener('change', _fileSelected);
		var tapEl = document.querySelector('.FileUpload');
		resEl = document.querySelector('.Response');
		keyEl = document.getElementById('keyword');
		var formEl = document.getElementById('form');
		tapEl.addEventListener('click', _onTap);
		keyEl.addEventListener('focus', _onFocusIn);
		keyEl.addEventListener('focusout', _onFocusOut);
		formEl.addEventListener('submit', _onFormSub);
	}

	socket.on('handshake', function(data) {
		socketId = data.id;
		console.log(socketId);
	});

	socket.on('video:complete', function(data) {
		console.log(data);
	});

	socket.on('socket:update:keywords', function(data) {
		update(data);
	});

	socket.on('socket:update:time', function(data) {
		timerEl.innerHTML = data + ' remaining';
	});

	socket.on('socket:redirect:progress', function() {
		window.location.href = "http://localhost:3000/progress";
	});

	window.addEventListener("load", init);
}



var bpm = new FileUpload();