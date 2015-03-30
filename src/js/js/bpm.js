function BPM() {
	var MIN_MILLI = 60 * 1000;
	var previousTap;
	var currentTap;
	var counterEl;
	var socket = io('http://localhost');
	var MAX_TAPS = 7;
	var taps = [];

	function _onTap(e) {
		currentTap = new Date().getTime();
		var difference = currentTap - previousTap;
		var bpm = Math.round(MIN_MILLI / difference);
		//DIFFERENCE IS IN MILLISECONDS FOR MAX
		taps.push(difference);
		if(taps.length > MAX_TAPS){
			taps.shift();
		}
		var sum = taps.reduce(function(a, b) { return a + b; });
		var avg = sum / taps.length;
		if (!isNaN(avg)) {
			counterEl.innerHTML = bpm;
			//SEND OUTS MILLISECONDS
			socket.emit('socket:bpm', {
				bpm:avg
			});
		}
		previousTap = new Date().getTime();
	}

	function init() {
		var screenEl = document.getElementById('bpm');
		counterEl = document.getElementById('counter');
		screenEl.addEventListener('click', _onTap);
	}

	socket.on('handshake', function(data) {
		console.log(data);
	});

	window.addEventListener("load", init);
}



var bpm = new BPM();