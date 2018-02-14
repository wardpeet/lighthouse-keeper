/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global LighthouseReportViewer, Logger */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const loadPolyfillPromises = [];
if (!('fetch' in window)) {
  loadPolyfillPromises.push(loadScript('./src/polyfills/fetch.js'));
}
if (!('URLSearchParams' in window)) {
  loadPolyfillPromises.push(loadScript('./src/polyfills/url-search-params.js'));
}

// Lazy load polyfills that are needed. If any of the load promises fails,
// stop and don't create a report.
Promise.all(loadPolyfillPromises).then(_ => {
  window.logger = new Logger(document.querySelector('#lh-log'));

  // Listen for log events from main report.
  document.addEventListener('lh-log', e => {
    switch (e.detail.cmd) {
      case 'log':
        window.logger.log(e.detail.msg);
        break;
      case 'warn':
        window.logger.warn(e.detail.msg);
        break;
      case 'error':
        window.logger.error(e.detail.msg);
        break;
      case 'hide':
        window.logger.hide();
        break;
    }
  });

  window.viewer = new LighthouseReportViewer();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
