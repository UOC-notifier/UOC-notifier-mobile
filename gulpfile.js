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
