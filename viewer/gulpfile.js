/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const del = require('del');
const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const runSequence = require('run-sequence');
const browserify = require('browserify');
const ghpages = require('gh-pages');
const source = require('vinyl-source-stream');
const streamqueue = require('streamqueue');
const vinylBuffer = require('vinyl-buffer');


// Use uglify-es to get ES6 support.
const uglifyEs = require('uglify-es');
const composer = require('gulp-uglify/composer');
const uglify = composer(uglifyEs, console);

const ReportGenerator = require(path.resolve(path.dirname(require.resolve('lighthouse')), 'report/v2/report-generator.js'));
const lighthousePackage = require(path.resolve(path.dirname(require.resolve('lighthouse')), '../package.json'));

const $ = gulpLoadPlugins();

function license() {
  return $.license('Apache', {
    organization: 'Google Inc. All rights reserved.',
  });
}

/**
 * Create a vinyl buffer stream from the given string. Supports optional fake
 * filename for vinyl object.
 * @param {string} content
 * @param {string} fakeFileName
 * @return {!Stream}
 */
function streamFromString(content, fakeFilename = 'fake.file') {
  const stream = source(fakeFilename);
  stream.end(content);
  return stream.pipe(vinylBuffer());
}

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`dist/images`));
});

// Concat Report and Viewer stylesheets into single viewer.css file.
gulp.task('concat-css', () => {
  const reportCss = streamFromString(ReportGenerator.reportCss, 'report-styles.css');
  const viewerCss = gulp.src('app/styles/viewer.css');

  return streamqueue({objectMode: true}, reportCss, viewerCss)
    .pipe($.concat('viewer.css'))
    .pipe(gulp.dest(`dist/styles`));
});

gulp.task('html', () => {
  const templatesStr = ReportGenerator.reportTemplates;

  return gulp.src('app/index.html')
    .pipe($.replace(/%%LIGHTHOUSE_TEMPLATES%%/, _ => templatesStr))
    .pipe(gulp.dest('dist'));
});

gulp.task('pwa', () => {
  return gulp.src([
    'app/sw.js',
    'app/manifest.json',
  ]).pipe(gulp.dest('dist'));
});

gulp.task('polyfills', () => {
  return gulp.src([
    'node_modules/url-search-params/build/url-search-params.js',
    'node_modules/whatwg-fetch/fetch.js',
  ])
  .pipe(gulp.dest(`dist/src/polyfills`));
});

// Combine multiple JS bundles into single viewer.js file.
gulp.task('compile-js', () => {
  // JS bundle from browserified ReportGenerator.
  const generatorFilename = path.resolve(path.dirname(require.resolve('lighthouse')), 'report/v2/report-generator.js');
  const opts = {standalone: 'ReportGenerator'};
  const generatorJs = browserify(generatorFilename, opts)
    .transform('brfs')
    .bundle()
    .pipe(source('report-generator.js'))
    .pipe(vinylBuffer());

  // JS bundle from report renderer scripts.
  const baseReportJs = streamFromString(ReportGenerator.reportJs, 'report.js');

  // JS bundle of library dependencies.
  const deps = gulp.src([
    'node_modules/idb-keyval/dist/idb-keyval-min.js',
  ]);

  // JS bundle of injectected global variable with current Lighthouse version.
  const versionStr = `window.LH_CURRENT_VERSION = '${lighthousePackage.version}';`;
  const versionJs = streamFromString(versionStr, 'report.js');

  // JS bundle of viewer-specific JS files.
  const viewerJs = gulp.src('app/src/*.js');

  // Concat and uglify JS bundles in this order.
  return streamqueue({objectMode: true}, generatorJs, baseReportJs, deps, versionJs, viewerJs)
    .pipe($.concat('viewer.js', {newLine: ';\n'}))
    .pipe(uglify())
    .pipe(license())
    .pipe(gulp.dest(`dist/src`));
});

gulp.task('clean', () => {
  return del(['dist']).then(paths =>
    paths.forEach(path => $.util.log('deleted:', $.util.colors.blue(path)))
  );
});

gulp.task('watch', ['build'], () => {
  gulp.watch([
    'app/styles/**/*.css',
    path.resolve(path.dirname(require.resolve('lighthouse')), 'report/v2/**/*.css'),
  ]).on('change', () => {
    runSequence('concat-css');
  });

  gulp.watch([
    'app/index.html',
    path.resolve(path.dirname(require.resolve('lighthouse')), 'report/v2/templates.html'),
  ]).on('change', () => {
    runSequence('html');
  });

  gulp.watch([
    'app/manifest.json',
    'app/sw.js',
  ]).on('change', () => {
    runSequence('pwa');
  });

  gulp.watch([
    path.resolve(path.dirname(require.resolve('lighthouse')), 'report/v2/report-generator.js'),
    'app/src/*.js',
  ]).on('change', () => {
    runSequence('compile-js');
  });
});

gulp.task('build', cb => {
  runSequence(
    'compile-js',
    ['html', 'pwa', 'images', 'concat-css', 'polyfills'], cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
