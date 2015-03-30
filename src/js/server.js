var _ = require('lodash');
var iExpress = require('./express');
var youtube = require('./youtube/youtube');
iExpress.setYoutube(youtube);
youtube.express = iExpress;