/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name AuthorizationHeaderSvc
 * @description
 * 
 * Service for applying Authorization Header to all requests to the serviceUrl
 * 
 * Exposes setToken(<token>). If token has not been set, the header is not applied.
 */
$btmod.factory('AuthorizationHeaderSvc', function (blacktiger) {
    var token = undefined;
    return {
        setToken: function(newToken) {
            token = newToken;
        },
        'request': function(config) {
            if(angular.isDefined(token) && config.url.substr(0, blacktiger.getServiceUrl().length) === blacktiger.getServiceUrl()) {
                config.headers = config.headers || {};
                config.headers.Authorization = token;
            }
            return config;
        }
    };
});
