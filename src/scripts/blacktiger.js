    /*exported $btmod */
'use strict';

/**
 * @namespace blacktiger
 * @name blacktiger
 * @description 
 * 
 * The `blacktiger` module defines services etc. for communicating with a Blacktiger server.
 * 
 * It requires ngResource and LocalStorageModule.
 *
 */
var $btmod = angular.module('blacktiger', [
    'ngResource',
    'LocalStorageModule'
]);

$btmod.config(function($httpProvider) {
    $httpProvider.interceptors.push('AuthorizationHeaderSvc');
});

$btmod.run(function(HistorySvc) {
    // Dummy to make sure that HistorySvc is initialized from the beginning.
    HistorySvc.getVariableName();
});
