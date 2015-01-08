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
$btmod.factory('StompSvc', function ($rootScope) {
    var stompClient = {};

    function NGStomp(url) {
        var ws = new SockJS(url);
        this.stompClient = Stomp.over(ws);
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

    NGStomp.prototype.connect = function (user, password, onConnect, onError) {
        // The Spring Stomp implementation does not like user/password, even though it should just ignore it.
        // Sending empty headers instead of user/pass.
        this.stompClient.connect({},
                function (frame) {
                    $rootScope.$apply(function () {
                        onConnect.apply(stompClient, frame);
                    });
                },
                function (frame) {
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