/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name SummarySvc
 * @description
 * 
 * Service for retreiving summary of servers statistics
 * 
 * This service exposes one method: 'getSummary'.
 * getSummary returns a promise that, when it is susccessfull, will hold an object with summary of the statistics.
 * It will be retreived by requesting <serviceurl>/system/summary.
 */
$btmod.factory('SummarySvc', function ($http, blacktiger, $q) {
    return {
        getSummary: function () {
            var deferred = $q.defer();
            $http.get(blacktiger.getServiceUrl() + 'system/summary').then(function (resp) {
                if(resp.status === 200) {
                    deferred.resolve(resp.data);
                } else {
                    deferred.reject(resp);
                }
            });
            return deferred.promise;
        }
    };
});

