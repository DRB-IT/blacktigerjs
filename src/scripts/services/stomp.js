/*global $btmod, Stomp, SockJS*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name StompSvc
 * @description
 * 
 * Service for communicating with the server over the Stomp protocol.
 * See http://jmesnil.net/stomp-websocket/doc/ for more info.
 */
$btmod.factory('StompSvc', function ($rootScope, $interval) {
    var stompClient = {};
    
    function NGStomp(url) {
        if(url.indexOf('http://') === 0) {
            url = 'ws://' + url.substr(7);
        }
        if(url.indexOf('https://') === 0) {
            url = 'wss://' + url.substr(7);
        }
        this.stompClient = Stomp.client(url);
    }

    NGStomp.prototype.subscribe = function (queue, callback) {
        return this.stompClient.subscribe(queue, function () {
            var args = arguments;
            $rootScope.$apply(function () {
                callback(args[0]);
            });
        });
    };

    NGStomp.prototype.send = function (queue, headers, data) {
        this.stompClient.send(queue, headers, data);
    };

    NGStomp.prototype.connect = function (user, password, onConnect, onError, enforcedHeartbeatInterval) {
        // The Spring Stomp implementation does not like user/password, even though it should just ignore it.
        // Sending empty headers instead of user/pass.
        var that = this;
        this.stompClient.connect({},
                function (frame) {
                    if(angular.isNumber(enforcedHeartbeatInterval)) {
                        that.heartbeatPromise = $interval(function() {
                            that.stompClient.ws.send('\x0A');
                        }, enforcedHeartbeatInterval);
                    }
                    $rootScope.$apply(function () {
                        onConnect.apply(stompClient, frame);
                    });
                },
                function (frame) {
                    if(angular.isDefined(that.heartbeatPromise)) {
                        $interval.cancel(that.heartbeatPromise);
                    }
                    $rootScope.$apply(function () {
                        onError.apply(frame);
                    });
                });
    };

    NGStomp.prototype.disconnect = function (callback) {
        this.stompClient.disconnect(function () {
            var args = arguments;
            $rootScope.$apply(function () {
                callback.apply(args);
            });
        });
    };

    return function (url) {
        return new NGStomp(url);
    };
});
