var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var stripComments = require('gulp-strip-comments');
var removeEmptyLines = require('gulp-remove-empty-lines');
var clipEmptyFiles = require('gulp-clip-empty-files');
var insert = require('gulp-insert');
var gulpSlash = require('gulp-slash');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
var sh = require('shelljs');
var del = require('del');

var license = '' +
  '// Copyright (C) 2017 Pau Ferrer Ocaña\n' +
  '//This program is free software; you can redistribute it and/or\n' +
  '//modify it under the terms of the GNU General Public License\n' +
  '//as published by the Free Software Foundation; either version 2\n' +
  '//of the License, or (at your option) any later version.\n//\n' +
  '//This program is distributed in the hope that it will be useful,\n' +
  '//but WITHOUT ANY WARRANTY; without even the implied warranty of\n' +
  '//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n' +
  '//GNU General Public License for more details.\n//\n' +
  '//You should have received a copy of the GNU General Public License\n' +
  '//along with this program; if not, write to the Free Software\n' +
  '//Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.\n\n';
  buildFile = 'app.js';

var paths = {
  build: './www/build',
  js: [
    './www/main.js',
    './www/services/*.js',
    './www/directives/*.js',
    './www/controllers/*.js'
  ],
  sass: './www/css/style.scss'
};

gulp.task('default', ['sass', 'js']);
gulp.task('build', ['sass', 'js']);
gulp.task('build-prepare', ['build']);
gulp.task('serve:before', ['build', 'watch']);

gulp.task('sass', function(done) {
  gulp.src(paths.sass)
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, { interval: 500 }, ['sass']);
  gulp.watch(paths.js, { interval: 500 }, ['js']);
});

gulp.task('js', function(done) {
  var dependencies = ["'mm.core'"],
      componentRegex = /core\/components\/([^\/]+)\/main.js/,
      pluginRegex = /addons\/([^\/]+)\/main.js/,
      subpluginRegex = /addons\/([^\/]+)\/([^\/]+)\/main.js/;

  gulp.src(paths.js)
    .pipe(gulpSlash())
    .pipe(clipEmptyFiles())
    // Remove comments, remove empty lines, concat and add license.
    .pipe(stripComments())
    .pipe(removeEmptyLines())
    .on('error', sass.logError)
    .pipe(concat(buildFile))
    .pipe(insert.prepend(license))
    .pipe(gulp.dest(paths.build))
    .on('end', done);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});

gulp.task('delete-files', function() {
 //remove unnecessary files
 console.log('delete-files STARTED');
 del([
   'platforms/android/assets/www/controllers/**',
   'platforms/android/assets/www/css/**',
   'platforms/android/assets/www/directives/**',
   'platforms/android/assets/www/main.js',
   'platforms/android/assets/www/lib/ionic/**',
   '!platforms/android/assets/www/lib/ionic',
   '!platforms/android/assets/www/lib/ionic/release',
   '!platforms/android/assets/www/lib/ionic/release/js',
   '!platforms/android/assets/www/lib/ionic/release/js/ionic.bundle.min.js',
   '!platforms/android/assets/www/lib/ionic/release/fonts',
   '!platforms/android/assets/www/lib/ionic/release/fonts/**',
   'platforms/android/assets/www/lib/chart.js/**',
   '!platforms/android/assets/www/lib/chart.js',
   '!platforms/android/assets/www/lib/chart.js/dist',
   '!platforms/android/assets/www/lib/chart.js/dist/Chart.min.js',
   'platforms/android/assets/www/lib/angular-chart.js/**',
   '!platforms/android/assets/www/lib/angular-chart.js',
   '!platforms/android/assets/www/lib/angular-chart.js/dist',
   '!platforms/android/assets/www/lib/angular-chart.js/dist/angular-chart.min.js',
   'platforms/android/assets/www/lib/angular-animate/**',
   'platforms/android/assets/www/lib/angular/**',
   'platforms/android/assets/www/lib/angular-sanitize/**',
   'platforms/android/assets/www/lib/angular-ui-router/**',
   'platforms/android/assets/www/lib/angular-translate/**',
   '!platforms/android/assets/www/lib/angular-translate',
   '!platforms/android/assets/www/lib/angular-translate/angular-translate.min.js',
   'platforms/android/assets/www/lib/angular-translate-loader-static-files/**',
   '!platforms/android/assets/www/lib/angular-translate-loader-static-files',
   '!platforms/android/assets/www/lib/angular-translate-loader-static-files/angular-translate-loader-static-files.min.js',
   'platforms/android/assets/www/lib/ngCordova/**',
   '!platforms/android/assets/www/lib/ngCordova',
   '!platforms/android/assets/www/lib/ngCordova/dist',
   '!platforms/android/assets/www/lib/ngCordova/dist/ng-cordova.min.js',
   'platforms/android/assets/www/lib/platform.js/**',
   '!platforms/android/assets/www/lib/platform.js',
   '!platforms/android/assets/www/lib/platform.js/platform.js'
   ])
   .then(function() {
     console.log('delete-files DONE');
   });
});
