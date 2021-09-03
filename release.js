// ===================================================
// FOR PRODUCTION
// Total.js - framework for Node.js platform
// https://www.totaljs.com
// ===================================================

const options = {};

// options.ip = '127.0.0.1';
options.port = 9000;
// options.config = { name: 'Total.js' };
// options.sleep = 3000;

// require('total.js').http('release', options);

const Sentry = require('@sentry/node');
// or use es6 import statements
// import * as Sentry from '@sentry/node';

Sentry.init({ dsn: 'https://8a7b8edb176249de940978c69b383c21@o386444.ingest.sentry.io/5353190' });
/// myUndefinedFunction();

require('total.js').cluster.http(5, 'release', options);