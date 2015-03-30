var PORT = 8000;

/* jshint strict: false */
var gulp = require('gulp'),
	browserify = require('browserify'),
	source = require('vinyl-source-stream'),
	chalk = require('chalk'),
	connectHistoryApiFallback = require('connect-history-api-fallback'),
	shelljs = require('shelljs'),
	nwbuilder = require('node-webkit-builder'),
	jsonminify = require('gulp-jsonminify'),
	plugins = require('gulp-load-plugins')();

/*var gulp = require('gulp'),
	plugins = require('gulp-load-plugins')(),
	jshint = require('gulp-jshint'),
	csslint = require('gulp-csslint');*/
// paths and file names
var src = './src',
	dist = './',
	maxModules = dist+ 'max-modules/',
	nodeModules = './node_modules',
	distAssets = dist + 'assets',
	jsSrc = src + '/js/',
	jsonSrc = src + '/json/',
	jsIndex = 'main.js',
	iconSrc = src + '/glyphs/svg/',
	iconDist = distAssets+'/icons/',
	jsDist = distAssets + '/js/',
	jsonDist = distAssets + '/json/',
	jsBundle = 'bundle.js',
	cssSrc = src + '/styl/',
	cssIndex = 'main.css',
	cssDist = distAssets + '/css/',
	cssBundle = 'styles.css',
	tplSrc = src + '/ejs/**/*.ejs',
	vendors = distAssets + '/vendor/';


//DEFAULT
gulp.task('default', []);