'use strict';
var _ = require('lodash');
var Q = require('q');
var ff = require('fluent-ffmpeg');
var request = require('request');
var shell = require('shelljs');
var fs = require('fs');
var youtubeDL = require('ytdl-core');
var ffcommand = require('./ffmpeg-command');
var FFMPEGCommand = new ffcommand();
var DEST = "/Users/samelie/Dropbox/Max/_presentation/assets/video/";
var YOUTUBE_QUERIES = 12;
var MAX = require('../max');
//options
var _options = {
	channelSubscribersMin: 0,
	channelSubscribersMax: -1,
	mixChannelVideos: false,
	outputDuration: 6, //mins
	randomness: 1, // 0 - 1
	searchOrder: 'relvance',
	searchPrecision: 15, //pages
	searchType: 'video', //pages
	segmentDurationMin: 0.02, //mins
	segmentDurationMax: 0.04, //mins
	videoDurationMin: 3, //mins
	videoDurationMax: 15, //mins
	viewCountMin: 0,
	viewCountMax: -1,
	videosPerKeyword: 4
};
var segmentDurationMinMilli = _options['segmentDurationMin'] * 60 * 1000; //mins
var segmentDurationMaxMilli = _options['segmentDurationMax'] * 60 * 1000; //mins

var _getTimeline = function _constructTimeline(howManyGroups) {
	var timeline = [];
	var l = howManyGroups;
	console.log("howmany groups: ", l);
	//all times in milliseconds
	var totalDuration = _options['outputDuration'] * 60 * 1000;
	//timeslot for each keyword
	var keywordDuration = Math.floor(totalDuration / l);
	//timeline
	for (var i = 0; i < l; i++) {
		//each keyword gets segment durations
		timeline.push([]);

		//how many can fit in there
		var maxNumberClips = totalDuration / segmentDurationMinMilli;

		var addedClips = 0;

		for (var j = 0; j < maxNumberClips; j++) {
			//
			var clipRandomDuration = Math.floor((Math.random() * (segmentDurationMaxMilli - segmentDurationMinMilli)) + segmentDurationMinMilli);
			timeline[i].push(clipRandomDuration);
			addedClips += clipRandomDuration;
			if (addedClips > keywordDuration) {
				var remainder = addedClips - keywordDuration;
				timeline[i][timeline[i].length - 1] = Math.min(remainder, 1200);
				break;
			}
		}
	}
	return timeline;
};


var YOUTUBE = {
	express: undefined,
	rawYoutubeResults: undefined,
	timeline: undefined,
	makeVideo: function(keywords, users) {
		var self = this;
		var videoVO = {
			url: undefined,
			type: undefined,
			name: undefined,
			absPath: undefined,
			path: undefined
		};
		var VOs = []; //array of arrays
		var terms = [];
		var votes = [];
		var functions = [];
		var customVOs = [];

		_.forIn(keywords, function(voteObj, term) {
			votes.push({
				key: term,
				value: voteObj['votes']
			});
		}, this);
		votes.sort(function(a, b) {
			return a.value - b.value;
		}).reverse();
		votes = votes.splice(0, YOUTUBE_QUERIES);

		_.each(votes, function(voteObj) {
			terms.push(voteObj['key']);
			functions.push("self.queryYoutube(" + "\"" + voteObj['key'] + "\"" + ")");
		});

		var customVideosLength = 0;
		_.each(users, function(user) {
			console.log(user['type'], user['inputData']);
			if (user['type'] === 'video' && !user['admin']) {
				var vo = _.clone(videoVO);
				vo['name'] = user['inputData']['name'];
				vo['absPath'] = user['inputData']['absolutePath'];
				customVOs.push(vo);
				customVideosLength++;
			}else if(user['admin']){
				if(user['inputData']){
					MAX.readSecond(user['inputData']['absolutePath']);
				}
			}
		});
		console.log(terms);
		console.log(customVideosLength);

		this.timeline = _getTimeline(terms.length * _options['videosPerKeyword'] + customVideosLength);
		console.log(this.timeline);
		var func = '[' + functions.join() + ']';
		var promises = Q.all(eval(func));
		Q.allSettled(promises).then(function(results) {
			var all = [];
			_.each(results, function(result) {
				var l = VOs.length;
				all.push(result['value'])
				VOs.push([]);
				//loop through items
				for (var i = 0; i < result['value'].length; i++) {
					//this is linear, could be random
					var snippet = result['value'][i]['snippet'];
					if (!snippet) {
						continue;
					}
					var name = snippet['title'].replace(/\s/g, "_") + "_" + i;
					name = name.replace(/\//g, '_');
					name = name.replace(/[^a-zA-Z ]/g, "");
					var r = Math.floor(Math.random() * 4);
					if (r % 2 === 0) {
						if (VOs[l].length < _options['videosPerKeyword']) {
							var vo = _.clone(videoVO);
							vo['name'] = name;
							vo['type'] = 'youtube';
							vo['url'] = "http://www.youtube.com/watch?v=" + result['value'][i]['id']['videoId'];
							VOs[l].push(vo)
						}
					}
				}
			});
			self.rawYoutubeResults = _.flatten(all);
			self.downloadAll(VOs).then(function(veeoz) {
				var count = 0;
				var total = customVideosLength;
				if (customVOs.length > 0) {
					_.each(customVOs, function(vo) {
						self._getDuration(vo).then(function(v) {
							count++;
							if (total === count) {
								self._doCommand(veeoz);
							}
						});
						veeoz.push([vo]);
					});
				}
				if (count === total) {
					self._doCommand(veeoz);
				}
			});
		});
	},


	_doCommand: function(veeoz) {
		var manifest = this.makeMix(veeoz, this.timeline);
		console.log(manifest);
		var command = FFMPEGCommand.getFFMPEG(manifest, true);
		this.express.redirectControls();
		console.log(command);
		setTimeout(function(){
			shell.exec(command);
			MAX.readFirst(manifest['output']);
			console.log("COMPLETE!!!!!!!!!!!!!!!!!", manifest['output']);
		}, 2000);
	},

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

	/*
		Compares the VOs with the timeline
	*/

	makeMix: function(VOs, timeline) {
		var self = this;
		var ffmpegManifest = [];
		var videoCount = 0;
		var flattened = _.flatten(VOs);
		console.log(flattened.length, timeline.length);
		_.each(flattened, function(vo, index) {
			var numberSampleRegions = Math.floor(vo['duration'] / segmentDurationMinMilli);
			vo['segments'] = timeline[index];
			vo['sampleRegionsCount'] = numberSampleRegions;
			ffmpegManifest.push({
				input: vo['absPath'],
				index: videoCount,
				segments: self.buildSegments(vo)
			});
			videoCount++;
		});
		ffmpegManifest['output'] = DEST + "final_output.mp4";
		return ffmpegManifest;
	},

	buildSegments: function(clipObj) {
		var ranIndexs = [];
		var segments = [];
		var numberOfSegments = clipObj['segments'].length;
		for (var i = 0; i < numberOfSegments; i++) {
			var found = false;
			while(!found){
				var randomSlotIndex = Math.floor(Math.random() * clipObj['sampleRegionsCount']);
				if(ranIndexs.indexOf(randomSlotIndex) === -1){
					found = true;
				}
			}
			//maybe this can't be 0
			var startTime = Math.ceil(segmentDurationMinMilli * randomSlotIndex / 1000); //in seconds
			var endTime = startTime + Math.ceil(clipObj['segments'][i] / 1000);
			segments.push({
				startTime: startTime,
				endTime: endTime
			});
			ranIndexs.push(randomSlotIndex);
		}
		return segments;
	},


	queryYoutube: function(q) {
		var defer = Q.defer();
		var count = 0;
		var resultItems = [];
		var params = {
			query: q,
			maxResults: 50,
			videoDuration: 'short',
			type: 'video'
		};
		request({
			url: 'http://samelie.jit.su/youtube/search/',
			qs: params
		}, function(err, response, body) {
			if (err) {
				console.log(err);
			}
			var parsed = JSON.parse(body);
			defer.resolve(parsed['items']);
		});
		return defer.promise;
	},

	downloadAll: function(VOs) {
		var self = this;
		var defer = Q.defer();
		var count = 0;
		var total = 0;
		console.log(VOs);
		_.each(VOs, function(arr) {
			total += arr.length;
			_.each(arr, function(vo) {
				this._youtubeDL(vo)
					.then(function(v) {
						count++;
						console.log("completed", v['name'], count, total);
						self.express.broadcastMessage(v);
						if (count === total) {
							console.log("Complete");
							defer.resolve(VOs);
						}
					});
			}, this);
		}, this);
		return defer.promise;
	},

	_getRandomVideo: function(vo) {
		var r = Math.floor(Math.random() * this.rawYoutubeResults.length);
		var result = this.rawYoutubeResults[r];
		var snippet = result['snippet'];
		if (!snippet) {
			return vo;
		}
		var name = snippet['title'].replace(/\s/g, "_") + "_" + r;
		name = name.replace(/\//g, '_');
		name = name.replace(/[^a-zA-Z ]/g, "");
		vo['name'] = name;
		vo['url'] = "https://www.youtube.com/watch?v=" + result['id']['videoId'];
		return vo;
	},

	_youtubeDL: function(vo) {
		var self = this;
		var defer = Q.defer();

		function __do(v, d) {
			var name = v['name'];
			console.log("Downlaoding ", v['url']);
			youtubeDL(v['url'], {
					quality: '18'
				})
				.on('error', function(e) {
					console.log("Error!!!", v['url']);
					console.log(e);
					__do(self._getRandomVideo(v), d);
				})
				.pipe(fs.createWriteStream(DEST + name + ".mp4")).on('finish', function() {
					v['absPath'] = DEST + name + ".mp4";
					v['path'] = name + ".mp4";
					self._getDuration(v).then(function() {
						d.resolve(v);
					});
				});
		}

		__do(vo, defer);

		return defer.promise;
	},

	_getDuration: function(vo) {
		var defer = Q.defer();
		ff.ffprobe(vo['absPath'], function(err, metadata) {
			if (metadata) {
				vo['duration'] = metadata['streams'][0]['duration'] * 1000;
			}
			defer.resolve(vo);
		});
		return defer.promise;
	}
}



//YOUTUBE.parseKeywords();

module.exports = YOUTUBE;