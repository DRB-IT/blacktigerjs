'use strict';

/**
 * @ngdoc Blacktiger API module
 * @name blacktigerjs
 * @description Defines with services etc. for communicating with a Blacktiger server.
 * # blacktigerjsApp
 *
 */
var $btmod = angular
  .module('blacktigerjsApp', [
    'ngCookies',
    'ngResource',
    'LocalStorageModule'
  ]);
