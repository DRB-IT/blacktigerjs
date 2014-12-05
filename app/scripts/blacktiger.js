/*exported $btmod */
'use strict';

/**
 * @ngdoc Blacktiger API module
 * @name blacktigerjs
 * @description Defines with services etc. for communicating with a Blacktiger server.
 * # blacktigerjsApp
 *
 */
var $btmod = angular.module('blacktiger-service', [
    'ngCookies',
    'ngResource',
    'LocalStorageModule'
]);
