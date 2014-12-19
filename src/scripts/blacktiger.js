    /*exported $btmod */
'use strict';

/**
 * @namespace blacktiger
 * @name blacktiger
 * @description 
 * 
 * The `blacktiger` module defines services etc. for communicating with a Blacktiger server.
 * 
 * It requires ngCookies, ngResource and LocalStorageModule.
 *
 */
var $btmod = angular.module('blacktiger', [
    'ngCookies',
    'ngResource',
    'LocalStorageModule'
]);
