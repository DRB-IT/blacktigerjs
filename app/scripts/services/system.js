'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.service:SystemSvc
 * @description
 * # SystemSvc
 * Service for retreiving information about the system.
 * 
 * This service exposes one method: 'getSystemInfo'.
 * getSystemInfo returns a promise that, when it is susccessfull, will hold an object with information about the system.
 * It will be retreived by requesting <serviceurl>/system/information.
 */
$btmod.factory('SystemSvc', function ($http, blacktiger) {
    return {
        getSystemInfo: function () {
            return $http.get(blacktiger.getServiceUrl() + 'system/information').then(function (response) {
                return response.data;
            });
        }
    };
});
