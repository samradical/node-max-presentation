'use strict'

var FFMPEG = {
	shuffleArray: function(arr) {
		var currentIndex = arr.length,
			temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = arr[currentIndex];
			arr[currentIndex] = arr[randomIndex];
			arr[randomIndex] = temporaryValue;
		}

		return arr;
	},
	makeCommand: function(VOs, timeline) {
		console.log(timeline);
		var shuffled = this.shuffleArray(VOs);
		console.log(shuffled);
		/*function _doInputLines() {
			var inputs = "";
			for (var i = 0; i < shuffled.length; i++) {
				inputs += "-i " + shuffled['absPath'] + " ";
			}
			return inputs;
		}
		var totalClips = 0;
		var command = "ffmpeg ";
		var inputLine = _doInputLines();
		command += inputLine + "-filter_complex \"";
		console.log(command);*/
	}
};

module.exports = FFMPEG;