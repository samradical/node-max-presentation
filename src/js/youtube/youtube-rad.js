'use strict';
var youtubeDL = require('ytdl-core');
var youtubeDL = require('ytdl-core');
var request = require('request');
var Q = require('q');
var _ = require('lodash');
//var shell = require('shelljs');
//var dir = require('node-dir');
var fs = require('fs');

//custom
var mixVideo = require('./ffmpeg-command');

/* OPTIONS
	
1. [keywords]
2. videos per keyword
3.presets 'current', 'popular', 'liked', 'dark'
4. options
{
	
}

*/
function YoutubeRad(keywords, videosPerKeyword, preset, options) {
	var defer = Q.defer();
	var options = options || {};
	var preset = preset;
	//urls
	var SEARCH_URL = "http://samelie.jit.su/youtube/search/";
	var INFO_URL = "http://samelie.jit.su/youtubeInfo/";
	var CHANNEL_URL = "http://samelie.jit.su/youtube/channel/";
	//youtube
	var SEARCH_ORDER_DATE = "date";
	var SEARCH_ORDER_RATING = "rating";
	var SEARCH_ORDER_RELEVANCE = "relevance";
	var SEARCH_ORDER_VIEW_COUNT = "viewCount";
	//presets
	var PRESETS = {
		current: {
			searchPrecision: 2,
			searchOrder: SEARCH_ORDER_DATE
		},
		popular: {
			searchPrecision: 2,
			searchOrder: SEARCH_ORDER_VIEW_COUNT
		},
		liked: {
			searchPrecision: 2,
			searchOrder: SEARCH_ORDER_RATING
		},
		dark: {
			searchPrecision: 10,
			searchOrder: SEARCH_ORDER_RELEVANCE
		},
		channel: {
			mixChannelVideos: true,
			searchPrecision: 0,
			searchType: 'channel'
		}
	};
	//socket io would set this.
	var userId = "sam";
	//var downloadDirectory = '/Users/samelie/Desktop/sam/';//__dirname + "/" + userId + "/";
	//var outputDirectory = '/Users/samelie/Desktop/output/';//__dirname + "/" + userId + "/";
	var downloadDirectory = '/Users/sam/Desktop/sam/';//__dirname + "/" + userId + "/";
	var outputDirectory = '/Users/sam/Desktop/output/';//__dirname + "/" 
	//variables
	var videos = [];
	var timeline = [];
	//params
	var _keywords = keywords;
	var _videosPerKeyword = videosPerKeyword;
	//options
	var _options = {
		channelSubscribersMin: 0,
		channelSubscribersMax: -1,
		mixChannelVideos: false,
		outputDuration: 2, //mins
		randomness: 1, // 0 - 1
		searchOrder: SEARCH_ORDER_RELEVANCE,
		searchPrecision: 15, //pages
		searchType: 'video', //pages
		segmentDurationMin: 0.02, //mins
		segmentDurationMax: 0.04, //mins
		videoDurationMin: 3, //mins
		videoDurationMax: 15, //mins
		viewCountMin: 0,
		viewCountMax: -1,
	};
	//ffmpeg
	var _mixBuilder = new mixVideo();
	//helpers
	var segmentDurationMinMilli = undefined;
	var segmentDurationMaxMilli = undefined;

	function start() {
		mergePresentsAndOptions(preset, options);

		console.log(_options);

		segmentDurationMinMilli = _options['segmentDurationMin'] * 60 * 1000; //mins
		segmentDurationMaxMilli = _options['segmentDurationMax'] * 60 * 1000; //mins

		timeline = [];
		videos = [];
		constructTimeline();
		console.log(timeline);
		downloadYoutubeVideos().then(function() {
			createMix();
		});
	}

	function mergePresentsAndOptions(p, o) {
		if (!p) {
			return;
		}
		var chosenPreset = PRESETS[p];
		if (!chosenPreset) {
			console.log("Bad preset");
			return;
		}
		for (var key in o) {
			_options[key] = o[key];
		}
		for (var key in chosenPreset) {
			//overwrite the preset with options
			if (o[key]) {
				chosenPreset[key] = o[key];
			}
			_options[key] = chosenPreset[key];
		}
	}

	function constructTimeline() {
		//all times in milliseconds
		var totalDuration = _options['outputDuration'] * 60 * 1000;
		//timeslot for each keyword
		var keywordDuration = Math.floor(totalDuration / _keywords.length);
		//timeline
		for (var i = 0; i < _keywords.length; i++) {
			//each keyword gets segment durations
			timeline.push([]);

			//how many can fit in there
			var maxNumberClips = totalDuration / segmentDurationMinMilli;

			var addedClips = 0;

			for (var j = 0; j < maxNumberClips; j++) {
				//
				var clipRandomDuration = Math.floor((Math.random() * (segmentDurationMaxMilli - segmentDurationMinMilli)) + segmentDurationMinMilli);
				console.log(clipRandomDuration);
				timeline[i].push(clipRandomDuration);
				addedClips += clipRandomDuration;
				if (addedClips > keywordDuration) {
					var remainder = addedClips - keywordDuration;
					timeline[i][timeline[i].length - 1] = remainder;
					break;
				}
			}
		}
	}

	///----------
	//step 1
	///----------
	function downloadYoutubeVideos() {
		var defer = Q.defer();
		_.each(_keywords, function(keyword, index) {
			//object for each keyword
			videos[index] = {};

			queryYoutube(keyword, videos[index]).then(function(searchResultData) {
				//search results
				var keyword = searchResultData['keyword'];
				var searchResult = searchResultData['result'];
				var keywordGroupObj = searchResultData['obj'];

				chooseYoutubeIds(searchResult, keywordGroupObj, keyword).then(function(objWithInfo) {

					var videoIds = _.keys(objWithInfo);
					_.each(videoIds, function(id, i) {
						//seems to overload without
						var previousVideoId = id;
						if (i > 0) {
							previousVideoId = videoIds[i - 1];
						}
						_.delay(function(videoId, previousId) {
							downloadVideo(objWithInfo, videoId, previousId).then(function(objWithDownload) {
								//check to see if its all done
								var complete = true;
								_.each(videos, function(keywordGroup, ii) {
									console.log("\n\n\n\n");
									console.log("-- ", ii, "--");
									for (var key in keywordGroup) {
										var videoObj = keywordGroup[key];
										console.log(videoObj.video);
										if (!videoObj.video) {
											complete = false;
										}
									}
								});
								if (complete) {
									defer.resolve();
								}
							});
						}, i * 10, id, previousVideoId);
					});
				});
			});
		});
		return defer.promise;
	}

	///----------
	//step 2
	///----------

	function createMix() {
		var ffmpegManifest = [];
		var videoCount = 0;
		_.each(videos, function(keywordGroup, index) {
			//all the segemnt durations for each of the keyword groups, clone it
			var clipDurationsByKeywordGroup = timeline[index].slice();
			//how many slots
			var clipByKeywordCount = clipDurationsByKeywordGroup.length;

			for (var videoId in keywordGroup) {
				//the youtube obj
				var clipObj = keywordGroup[videoId];
				//segemnts availble to snip from inside each of the youtube videos
				var numberSampleRegions = Math.floor(clipObj['duration'] / segmentDurationMinMilli);
				//how many clips each youtube video is allowed
				var segmentCount = Math.floor(clipByKeywordCount / _videosPerKeyword);
				//choose which clip durations to assign to the youtube video
				var clipSegments = [];
				while (clipSegments.length < segmentCount) {
					var randomIndex = Math.floor(Math.random() * clipDurationsByKeywordGroup.length);
					var randomDuration = clipDurationsByKeywordGroup[randomIndex];
					var returnedValue = clipDurationsByKeywordGroup.splice(randomIndex, 1);
					clipSegments.push(returnedValue[0]);
				}
				clipObj['segementDurations'] = clipSegments;
				clipObj['sampleRegionsCount'] = numberSampleRegions;

				ffmpegManifest.push({
					keyword: _keywords[index],
					input: clipObj['video'],
					index: videoCount,
					segments: buildSegments(clipObj, index, videoId)
				});
				console.log(ffmpegManifest.segments);
				ffmpegManifest['output'] = outputDirectory+"sam.mp4";
				videoCount++;
			}
		});
		console.log(ffmpegManifest);
		var command = _mixBuilder.getFFMPEG(ffmpegManifest, true);
		//_videos.length = 0;
		console.log(command);
		defer.resolve(command);
	}

	function buildSegments(clipObj, index, videoId) {
		var segments = [];
		var numberOfSegments = clipObj['segementDurations'].length;
		for (var i = 0; i < numberOfSegments; i++) {
			var randomSlotIndex = Math.floor(Math.random() * clipObj['sampleRegionsCount']);
			//maybe this can't be 0
			var startTime = Math.ceil(segmentDurationMinMilli * randomSlotIndex / 1000); //in seconds
			var endTime = startTime + Math.ceil(clipObj['segementDurations'][i] / 1000);
			segments.push({
				startTime: startTime,
				endTime: endTime
			});
		}
		return segments;
	}

	//----------
	///VIDEO SELECTION
	//----------

	function chooseYoutubeIds(searchResults, keywordGroupObj, keyword) {
		//keyword group obj has all the videos for that keyword
		var defer = Q.defer();

		function _randomChannelVideoChoice(channelResults) {
			var ran = Math.floor(Math.random() * channelResults['items'].length);
			var randomId = channelResults['items'][ran]['id']['videoId'];
			console.log(randomId);
			if (!randomId || keywordGroupObj[randomId]) {
				_randomChannelVideoChoice(channelResults);
			}

			queryVideoInfo(randomId).then(function(info) {
				var data = info['data'];
				var duration = data.items[0].contentDetails.duration;
				var videoDuration = youtubeDurationToMilliseconds(duration);
				_addVideoToKeywordGroup(keywordGroupObj, randomId, videoDuration, info);
				console.log(_.keys(keywordGroupObj), _videosPerKeyword);
				if (_.keys(keywordGroupObj).length === _videosPerKeyword) {
					defer.resolve(keywordGroupObj);
				} else {
					_randomChannelVideoChoice(channelResults);
				}
			});
		}

		function _randomVideoChoice() {
			//restrict random
			var length = Math.floor(searchResults.length * _options['randomness']);
			var ran = Math.floor(Math.random() * length);
			var randomId = searchResults[ran]['id']['videoId'];
			//video exists
			if (keywordGroupObj[randomId]) {
				_randomVideoChoice();
			}
			//adding the video info
			queryVideoInfo(randomId).then(function(info) {
				var data = info['data'];
				var duration = data.items[0].contentDetails.duration;
				var viewCount = data.items[0].statistics.viewCount;
				var channelId = data.items[0].snippet.channelId;
				//total video duration
				var totalDuration = _options['outputDuration'] * 60 * 1000;
				//millisecond for each keyword group
				var keywordDuration = Math.floor(totalDuration / _keywords.length);
				var maxDuration = _options['videoDurationMax'] * 60 * 1000;
				//if the video is longer than a clip needs to be
				var videoDuration = youtubeDurationToMilliseconds(duration);

				if (_subscribeFilter(channelId).then(function(subscribeSuccess) {
						if (subscribeSuccess) {
							if (_viewsFilter(viewCount)) {
								if (_durationFilter(videoDuration)) {
									//add it
									_addVideoToKeywordGroup(keywordGroupObj, randomId, videoDuration, info);
									if (_.keys(keywordGroupObj).length === _videosPerKeyword) {
										defer.resolve(keywordGroupObj);
									}
								} else {
									_randomVideoChoice();
								}
							} else {
								_randomVideoChoice();
							}
						} else {
							_randomVideoChoice();
						}
					}));
			});
		}

		function _forEachVideoInKeyword() {
			//multiple videos for each keyword
			for (var i = 0; i < _videosPerKeyword; i++) {
				//send in the obj
				_randomVideoChoice();
			}
		}

		function _tryToFindChannel() {
			//try and match the keywords with channeltitle
			var l = searchResults.length;
			for (var i = 0; i < l; i++) {
				var result = searchResults[i];
				if (keyword === result['snippet']['channelTitle']) {
					//do query
					queryYoutubeChannel(result['id']['channelId']).then(function(channelResults) {
						console.log(channelResults);
						_randomChannelVideoChoice(channelResults);
					});
					break;
				}
			}
		}

		if (_options['mixChannelVideos']) {
			_tryToFindChannel();
		} else {
			_forEachVideoInKeyword();
		}
		return defer.promise;
	}

	function _addVideoToKeywordGroup(keywordGroupObj, id, videoDuration, videoInfo) {
		keywordGroupObj[id] = {};
		keywordGroupObj[id]['videoInfo'] = videoInfo;
		keywordGroupObj[id]['duration'] = videoDuration;
	}

	function _durationFilter(videoDuration) {
		var success = false;
		var maxDuration = _options['videoDurationMax'] * 60 * 1000;
		if (videoDuration < maxDuration) {
			success = true;
		}
		return success;
	}

	function _viewsFilter(viewCount) {
		if (_options['viewCountMax'] === -1) {
			return true;
		}
		var success = false;
		if (viewCount > _options['viewCountMin'] &&
			viewCount < _options['viewCountMax']) {
			success = true;
		}
		return success;
	}

	function _subscribeFilter(channelId) {
		var defer = Q.defer();
		if (_options['channelSubscribersMax'] !== -1) {
			queryChannelInfo(cid).then(function(channelData) {
				if (channelData.items[0].statistics.subscriberCount < _options['channelSubscribersMax'] &&
					channelData.items[0].statistics.subscriberCount > _options['channelSubscribersMin']) {
					defer.resolve(true);
				} else {
					defer.resolve(false);
				}
			});
		} else {
			defer.resolve(true);
		}
		return defer.promise;
	}

	//-------
	//SERVICE
	//-------

	function downloadVideo(clipObj, id, previousId, defer) {
		var defer = defer || Q.defer();
		var url = "http://www.youtube.com/watch?v=" + id
		var directory = downloadDirectory

		youtubeDL(url, {
			quality: "18"
		}).pipe(fs.createWriteStream(directory + id + '.mp4')).on('finish', function() {
			clipObj[id]['path'] = directory + id + '.mp4';
			//add the user folder
			clipObj[id]['video'] = downloadDirectory + id + '.mp4';
			defer.resolve(clipObj);
		});

		/*var video = youtubeDL(url, ['--max-quality=18', '--verbose', '--youtube-skip-dash-manifest']);


		video.on('error', function(err) {
			console.log(err);
			console.log(clipObj);
			console.log(id);
			//just use the previous video
			clipObj[previousId]['path'] = directory + previousId + '.mp4';
			clipObj[previousId]['video'] = userId + "/" + previousId + '.mp4';
			defer.resolve(clipObj);
		});

		var t = video.pipe(fs.createWriteStream(directory + id + '.mp4')).on('finish', function() {
			clipObj[id]['path'] = directory + id + '.mp4';
			//add the user folder
			clipObj[id]['video'] = userId + "/" + id + '.mp4';
			console.log("Finished ", id);
			defer.resolve(clipObj);
		});
		console.log("Started: ", id);*/
		return defer.promise;
	}

	function queryYoutube(q, keywordGroupObj) {
		var defer = Q.defer();
		var count = 0;
		var resultItems = [];

		function _doquery(nextPageToken) {
			var params = {
				query: q,
				maxResults: 50,
				pageToken: nextPageToken,
				type: _options['searchType'],
				order: _options['searchOrder']
			};
			request({
				url: SEARCH_URL,
				qs: params
			}, function(err, response, body) {
				if (err) {
					console.log(err);
				}
				var parsed = JSON.parse(body);
				resultItems = resultItems.concat(parsed['items']);
				if (count < _options['searchPrecision']) {
					count++;
					_doquery(parsed['nextPageToken']);
				} else {
					defer.resolve({
						keyword:q,
						result: resultItems,
						obj: keywordGroupObj
					});
				}
			});
		}
		_doquery("");
		return defer.promise;
	}

	function queryYoutubeChannel(channelId) {
		var defer = Q.defer();
		var params = {
			channelId: channelId,
			maxResults: 50
		};

		request({
			url: SEARCH_URL,
			qs: params
		}, function(err, response, body) {
			if (err) {
				console.log(err);
			}
			defer.resolve(JSON.parse(body));
		});

		return defer.promise;
	}

	function queryVideoInfo(id) {
		var defer = Q.defer();
		var params = {
			id: id
		};
		request({
			url: INFO_URL,
			qs: params
		}, function(err, response, body) {
			if (err) {
				console.log(err);
			}
			defer.resolve({
				data: JSON.parse(body),
				id: id
			});
		});

		return defer.promise;
	}

	function queryChannelInfo(id) {
		var defer = Q.defer();
		var params = {
			id: id
		};
		request({
			url: CHANNEL_URL,
			qs: params
		}, function(err, response, body) {
			if (err) {
				console.log(err);
			}
			defer.resolve(JSON.parse(body));
		});

		return defer.promise;
	}

	//----------
	///---HELPERS
	//----------

	function formatYoutubeTime(value) {
		return value.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "");
	}


	function youtubeDurationToMilliseconds(value) {
		var formatted = formatYoutubeTime(value);
		var split = formatted.split(":");
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		var total = 0;
		if (split.length === 3) {
			hours = split[0] * 60 * 60 * 1000;
			minutes = split[1] * 60 * 1000;
			seconds = split[2] * 1000;
			total = hours + minutes + seconds;
		} else if (split.length === 2) {
			minutes = split[0] * 60 * 1000;
			seconds = split[1] * 1000;
			total = minutes + seconds;
		} else {
			seconds = split[0] * 1000;
			total = seconds;
		}
		return total;
	}

	start();

	return defer.promise;
}



module.exports = YoutubeRad;