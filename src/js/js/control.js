function Control() {
	var item;
	var control;
	var width;
	var dragging = false;
	var socket = io('http://localhost');

	function _onDrag(e) {
		console.log(e);
		if (dragging) {
			console.log(e);
		}
	}

	function init() {
		width = window.innerWidth;
		item = document.querySelector('.ControlItem');
		var ctrl = document.querySelector('.Control');
		var peram = document.getElementById('peram');

		var mc = new Hammer(ctrl);

		// let the pan gesture support all directions.
		// this will block the vertical scrolling on a touch-device while on the element
		mc.get('pan').set({
			direction: Hammer.DIRECTION_HORIZONTAL
		});

		// listen to events...

		mc.on("panleft panright", function(ev) {
			socket.emit('socket:control:emit', {
				msg: control,
				val: ev.deltaX / width
			});
		});

		/*window.addEventListener("orientationchange", function() {
			width = window.innerWidth;
		});*/
	}

	socket.on('handshake', function(data) {
		socket.emit('socket:control:handshake', data['id']);
	});

	socket.on('socket:control:set', function(c) {
		console.log(c);
		control = c.msg;
		peram.innerHTML =c.name;
	});

	window.addEventListener("load", init);
}



var bpm = new Control();