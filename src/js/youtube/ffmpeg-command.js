function MixVideos() {

}

MixVideos.prototype.getFFMPEG = function(manifest, hasAudio) {
	var totalClips = 0;
	var command = "ffmpeg ";
	var inputLine = doInputLines();
	command += inputLine + "-filter_complex \"";
	createLines();
	mixClips();
	var audioVideoLine = ":v=1";
	if (hasAudio) {
		audioVideoLine += ":a=1";
	}
	command += "concat=n=" + totalClips + audioVideoLine+ "[out]\" -map \"[out]\" " + manifest['output'] + " -y";
	function doInputLines() {
		var inputs = "";
		for (var i = 0; i < manifest.length; i++) {
			inputs += "-i " + manifest[i]['input'] + " ";
		}
		return inputs;
	}

	function createLines() {
		var count = 0;
		for (var i = 0; i < manifest.length; i++) {
			totalClips += manifest[i]['segments'].length;
			for (var j = 0; j < manifest[i]['segments'].length; j++) {
				var startTime = manifest[i]['segments'][j]['startTime'];
				var endTime = manifest[i]['segments'][j]['endTime'];

				var videoLine = "[" + i + ":v] scale=640x360,setsar=1:1,trim=" + startTime + ":" + endTime + ",setpts=PTS-STARTPTS[v" + count + "]; "
				command += videoLine;
				if (hasAudio) {
					var audioLine = "[" + i + ":a] atrim=" + startTime + ":" + endTime + ",asetpts=PTS-STARTPTS[a" + count + "]; "
					command += audioLine;
				}
				count++;
			}
		}
	}

	function mixClips() {
		var count = 0;
		var clips = [];
		for (var i = 0; i < manifest.length; i++) {
			for (var j = 0; j < manifest[i]['segments'].length; j++) {
				//this will make the audio be of the correct video
				var tag = "[v" + count + "]";
				if (hasAudio) {
					tag += " [a" + count + "]";
				}
				clips.push(tag);
				count++;
			}
		}
		var shuffled = shuffle(clips);
		var mixString = shuffled.join(",");
		command += mixString.replace(/\s*,\s*/g, ' ');
	}

	function shuffle(array) {
		var currentIndex = array.length,
			temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}
		return array;
	}
	return command;
};

module.exports = MixVideos;