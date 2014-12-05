/*global angular, $btmod*/
'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.provider:blacktiger
 * @description
 * # blacktigerProvider
 * Provider of basic blacktiger configuration methods.
 */
$btmod.provider('blacktiger', function ($window) {
    var serviceUrl = ''

    var instanceId = window.name;
    if (!instanceId || "" === instanceId) {
        $window.name = new Date().getTime();
        instanceId = $window.name;
    }

    var innerSetServiceUrl = function (url) {
        if (url.charAt(url.length - 1) !== '/') {
            url = url + '/';
        }
        serviceUrl = url;
    };

    this.setServiceUrl = innerSetServiceUrl;

    this.$get = function () {
        return {
            getServiceUrl: function () {
                return serviceUrl;
            },
            setServiceUrl: innerSetServiceUrl,
            getLanguageNames: function () {
                return languageNames;
            },
            getInstanceId: function () {
                return instanceId;
            }
        };
    };
});

