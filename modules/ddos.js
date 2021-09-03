var options = {};

// Maximum requests for user
options.maximum = 10;

// Ban timeout
options.minutes = 15;

INSTALL('module', 'https://modules.totaljs.com/ddos/v1.00/ddos.js', options);
// UNINSTALL('module', 'ddos');