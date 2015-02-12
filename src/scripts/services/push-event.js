/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name blacktigerjs.service:PushEventSvc
 * @description
 * 
 * Service that handles conversion of PushEvents from Server to Angular broadcasts.
 * 
 * This service connects via Stomp and takes any blacktiger events(ConferenceStart, 
 * ConferenceEnd, Join, Leave, CommentRequest, CommentRequestCancel, Mute, Unmute)
 * and broadcasts Angular events from them.
 * 
 * On every Push Event from server this service will broadcast an equivalent Angular event:
 * - 'ConferenceStart' will be broadcast as 'PushEvent.ConferenceStart' with room as parameter.
 * - 'ConferenceEnd' will be broadcast as 'PushEvent.ConferenceEnd' with roomNo as parameter.
 * - 'Join' will be broadcast as 'PushEvent.Join' with roomNo and participant as parameters.
 * - 'Leave' will be broadcast as 'PushEvent.Leave' with roomNo and channel as parameter.
 * - 'CommentRequest' will be broadcast as 'PushEvent.CommentRequest' with roomNo and channel as parameter.
 * - 'CommentRequestCanel' will be broadcast as 'PushEvent.CommentRequestCancel' with roomNo and channel as parameter.
 * - 'Mute' will be broadcast as 'PushEvent.Mute' with roomNo and channel as parameter.
 * - 'Unmute' will be broadcast as 'PushEvent.Unmute' with roomNo and channel as parameter.
 */
$btmod.factory('PushEventSvc', function ($rootScope, StompSvc, RoomSvc, LoginSvc, blacktiger, $log, $q) {
    var stompClient;

    var handleEvent = function (event) {
        $log.debug('Push Event received [type=' + event.type + '].');
        var channel = event.participant ? event.participant.channel : event.channel;
        switch (event.type) {
            case 'ConferenceStart':
                $rootScope.$broadcast('PushEvent.ConferenceStart', event.room, false);
                break;
            case 'ConferenceEnd':
                $rootScope.$broadcast('PushEvent.ConferenceEnd', event.roomNo);
                break;
            case 'Join':
            case 'Change':
                $rootScope.$broadcast('PushEvent.' + event.type, event.roomNo, event.participant);
                break;
            case 'Leave':
            case 'CommentRequest':
            case 'CommentRequestCancel':
            case 'Mute':
            case 'Unmute':
                $rootScope.$broadcast('PushEvent.' + event.type, event.roomNo, channel);
                break;
            default:
                $log.warn('Unknown push event was not broadcast [type=' + event.type + ']');
                break;
        }

    };

    var initializeSocket = function () {
        $rootScope.$broadcast('PushEventSvc.Initializing');
        var deferred = $q.defer();
        
        var user = LoginSvc.getCurrentUser();
        
        if(!user) {
            deferred.reject("Not authenticated via LoginSvc yet.");
            return deferred.promise;
        }
        
        var connected = false;
        stompClient = StompSvc(blacktiger.getServiceUrl() + 'socket'); // jshint ignore:line
        stompClient.connect(null, null, function () {
            connected = true;
            RoomSvc.query('full').$promise.then(function (result) {
                var rooms = [];
                angular.forEach(result, function (room) {
                    rooms.push(room);
                    $rootScope.$broadcast('PushEvent.ConferenceStart', room, true);
                });

                if (user.roles.indexOf('ROLE_ADMIN') >= 0) {
                    stompClient.subscribe('/queue/events/*', function (message) {
                        var e = angular.fromJson(message.body);
                        handleEvent(e);
                    });
                } else if (user.roles.indexOf('ROLE_HOST') >= 0 && rooms.length >= 1) {
                    stompClient.subscribe('/queue/events/' + rooms[0].id, function (message) {
                        var e = angular.fromJson(message.body);
                        handleEvent(e);
                    });
                }
                
                $rootScope.$broadcast('PushEventSvc.Initialized');
                deferred.resolve();
            });

        }, function (error) {
            if(connected) {
                $rootScope.$broadcast('PushEventSvc.Lost_Connection', error);
                connected = false;
            } else {
                deferred.reject(error);
            }
        }, '/');
        return deferred.promise;
    };

    return {
        connect: function () {
            return initializeSocket();
        },
        disconnect: function () {
            var deferred = $q.defer();
            if (!stompClient) {
                deferred.resolve();
            } else {
                stompClient.disconnect(function () {
                    deferred.resolve();
                });
            }
            return deferred.promise;
        }
    };
});
