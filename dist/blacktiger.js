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

/*global $btmod*/
'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.provider:blacktiger
 * @description
 * # blacktigerProvider
 * Provider of basic blacktiger configuration methods.
 */
$btmod.provider('blacktiger', function () {
    var serviceUrl = '';

    var instanceId = window.name;
    if (!instanceId || '' === instanceId) {
        window.name = new Date().getTime();
        instanceId = window.name;
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
            getInstanceId: function () {
                return instanceId;
            }
        };
    };
});


/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name AutoCommentRequestCancelSvc
 * @description
 * 
 * Service for automatically broadcasting CommentRequestCancel events when needed.
 * 
 * When a 'PushEvent.CommentRequest' is triggered we want to make sure that a 'PushEvent.CommentRequestCancel' 
 * is also given within a specific timeframe. If we don't the user will seem to continually wanting to give a comment 
 * if the participant simply forgot to trigger a CommentRequestCancel.
 * 
 * This service will detect the timeframe from 'CONFIG.commentRequestTimeout'(or default to 15000ms). On
 * each 'PushEvent.CommentRequest' it will register the participant and a timer in order to broadcast a 'PushEvent.CommentRequestCancel' 
 * for the participant. The cancel requests will be broadcast if and only if, the participant hasn't triggered it himself.
 */
$btmod.factory('AutoCommentRequestCancelSvc', ["$rootScope", "$timeout", "CONFIG", "$log", function ($rootScope, $timeout, CONFIG, $log) {
    var commentCancelPromiseArray = [],
            timeout = CONFIG.commentRequestTimeout,
            started = false;

    if (!angular.isNumber(timeout)) {
        timeout = 15000;
    }

    var updateCancelPromise = function (channel, newPromise) {
        $log.debug('Updating cancel promise. [channel=' + channel + ';newPromise=' + newPromise + ']');
        if (commentCancelPromiseArray[channel]) {
            $timeout.cancel(commentCancelPromiseArray[channel]);
        }
        if (newPromise) {
            commentCancelPromiseArray[channel] = newPromise;
        } else {
            delete commentCancelPromiseArray[channel];
        }
    };

    $rootScope.$on('PushEvent.CommentRequest', function (event, roomNo, channel) {
        if (started) {
            $log.debug('CommentRequest intercepted. Creating new timeout.');
            var promise = $timeout(function () {
                $log.debug('Broadcasting CommentRequestCancel event. [room=' + roomNo + ';channel=' + channel + ']');
                $rootScope.$broadcast('PushEvent.CommentRequestCancel', roomNo, channel);
            }, timeout);
            updateCancelPromise(channel, promise);
        }
    });

    $rootScope.$on('PushEvent.CommentRequestCancel', function (event, roomNo, channel) {
        if (started) {
            $log.debug('CommentRequestCancel intercepted. Cancelleing any related timeouts.');
            updateCancelPromise(channel);
        }

    });

    return {
        start: function () {
            started = true;
        },
        stop: function () {
            started = false;
        }
    };

}]);

/*global angular, $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name HistorySvc
 * @description
 * 
 * Service that holds historic information about calls made. 
 * 
 * This service does on purpose not deliver a reliable data base, as registering and keeping these information may be illegal in some countries.
 * Instead this service keeps information about the calls detected during the lifetime of the current browser instance only.
 * 
 * On every update this service will broadcast 'History.Updated' without any parameters.
 */
$btmod.factory('HistorySvc', ["$rootScope", "$cookieStore", "blacktiger", "$log", function ($rootScope, $cookieStore, blacktiger, $log) {
    $log.debug('Initializing HistorySvc');
    var historyCookieName = 'meetingHistory-' + blacktiger.getInstanceId();
    var history = $cookieStore.get(historyCookieName);

    var totalDurationForEntry = function (entry) {
        var duration = 0;
        var now = new Date();
        angular.forEach(entry.calls, function (call) {
            if (call.end !== null) {
                duration += call.end - call.start;
            } else {
                duration += now.getTime() - call.start;
            }
        });
        return duration;
    };

    var fireUpdated = function () {
        $rootScope.$broadcast('History.Updated');
    };

    var resetHistory = function () {
        $log.debug('Resetting history data');
        history = {};
        $cookieStore.put(historyCookieName, {});
        fireUpdated();
    };

    if (!history || !angular.isObject(history)) {
        resetHistory();
    }

    var createRoomEntry = function (roomNo) {
        $log.debug('Creating new entry.');
        history[roomNo] = {};
    };

    var handleConferenceStartEvent = function (event, room, initializing) {
        $log.debug('HistorySvc:handleConferenceStart');
        var i;
        if (history[room.id] === undefined) {
            createRoomEntry(room.id);
        }

        if (angular.isArray(room.participants)) {
            $log.debug('Conference had ' + room.participants.length + ' participants. Emitting them as events.');
            for (i = 0; i < room.participants.length; i++) {
                handleJoinEvent(undefined, room.id, room.participants[i], initializing);
            }
        }
    };

    var handleJoinEvent = function (event, roomNo, participant, resume) {
        $log.debug('HistorySvc:handleJoinEvent');
        var entries, entry, call, key;

        //Ignore the host. It will not be part of the history.
        if (participant.host) {
            return;
        }

        if (!angular.isDefined(history[roomNo])) {
            createRoomEntry(roomNo);
        }

        if (!angular.isDefined(participant.callerId)) {
            throw 'Participant does not have a callerId specified.';
        }

        entries = history[roomNo];
        key = participant.callerId;
        $log.debug('New participant - adding to history [key=' + key + '].');
        if (entries[key] === undefined) {
            $log.debug('Participant has no entry. Creating new entry.');
            entry = {
                type: participant.type,
                callerId: participant.callerId,
                phoneNumber: participant.phoneNumber,
                name: participant.name,
                firstCall: new Date().getTime(),
                calls: [],
                channel: participant.channel,
                totalDuration: 0
            };
            entries[key] = entry;
        } else {
            entry = entries[key];
            entry.channel = participant.channel;
        }

        if (resume && entry.calls.length > 0) {
            $log.debug('Resuming last call in call list for participant.');
            entry.calls[entry.calls.length - 1].end = null;
        } else {
            $log.debug('Appending new call to call list for participant.');
            call = {
                start: new Date().getTime(),
                end: null
            };
            entry.calls.push(call);
        }

        $log.debug('Persisting history.');
        $cookieStore.put(historyCookieName, history);
        fireUpdated();
    };

    var handleLeaveEvent = function (event, roomNo, channel) {
        $log.debug('HistorySvc:handleLeaveEvent');
        var entries, entry, i, key, call, changed = false;

        if (!angular.isDefined(history[roomNo])) {
            createRoomEntry(roomNo);
        }

        entries = history[roomNo];
        for (key in entries) {
            entry = entries[key];
            if (entry.channel === channel) {
                for (i = 0; i < entry.calls.length; i++) {
                    call = entry.calls[i];
                    if (call.end === null) {
                        call.end = new Date().getTime();
                        changed = true;
                    }
                }
                
                entry.totalDuration = totalDurationForEntry(entry);
            }
        }
        
        if (changed) {
            $cookieStore.put(historyCookieName, history);
            fireUpdated();
        }
    };

    var handlePhoneBookUpdate = function (event, number, name) {
        $log.debug('HistorySvc:handlePhoneBookUpdate');
        angular.forEach(history, function (entries) {
            angular.forEach(entries, function (entry) {
                if (number === entry.phoneNumber) {
                    entry.name = name;
                }
            });
        });
        $cookieStore.put(historyCookieName, history);
        fireUpdated();
    };

    var doFind = function (room, callerId, active) {
        if (room && !angular.isString(room)) {
            throw 'Room must be specified as String.';
        }

        var array = [], key, entry, _active, i, call, accepted, _room;
        $log.debug('Finding entries [room=' + room + ';callerId=' + callerId + ';active=' + active + ']');
        for (_room in history) {
            if (!angular.isDefined(room) || room === _room) {
                for (key in history[_room]) {
                    accepted = true;
                    _active = false;
                    entry = history[_room][key];

                    if (angular.isDefined(callerId)) {
                        accepted = (entry.callerId === callerId);
                    }

                    if (angular.isDefined(active)) {
                        _active = false;
                        for (i = 0; i < entry.calls.length; i++) {
                            call = entry.calls[i];
                            if (call.end === null) {
                                _active = true;
                                break;
                            }
                        }

                        if (_active !== active) {
                            accepted = false;
                        }
                    }

                    if (accepted) {
                        array.push(angular.copy(entry));
                    }
                }
            }
        }
        $log.debug('Found ' + array.length + ' entries');
        return array;
    };

    $rootScope.$on('PushEvent.ConferenceStart', handleConferenceStartEvent);
    $rootScope.$on('PushEvent.Join', handleJoinEvent);
    $rootScope.$on('PushEvent.Leave', handleLeaveEvent);
    $rootScope.$on('PhoneBook.Update', handlePhoneBookUpdate);

    return {
        getTotalDurationByRoomAndCallerId: function (room, callerId) {
            var duration = 0, entries = doFind(angular.isObject(room) ? room.id : room, callerId);
            if (entries && entries.length > 0) {
                duration = totalDurationForEntry(entries[0]);
            } else {
                $log.debug('HistorySvc.getTotalDurationByRoomAndCallerId: No entry found [room=' + room + ';callerId=' + callerId + ']');
            }
            return duration;
        },
        findOneByRoomAndCallerId: function (room, callerId) {
            var entries = doFind(angular.isObject(room) ? room.id : room, callerId);
            if (entries.length === 0) {
                return null;
            } else {
                return entries[0];
            }
        },
        deleteAll: function () {
            resetHistory();
        },
        findAll: function () {
            return doFind();
        },
        findAllByRoom: function (room) {
            return doFind(angular.isObject(room) ? room.id : room);
        },
        findAllByActive: function (active) {
            return doFind(undefined, undefined, active);
        },
        findAllByRoomAndActive: function (room, active) {
            return doFind(angular.isObject(room) ? room.id : room, undefined, active);
        },
        getCookieName: function () {
            return historyCookieName;
        }
    };
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name LoginSvc
 * @description
 * 
 * Service for handling Login.
 * 
 * Exposes the methods 'authenticate', 'deauthenticate' and 'getCurrentUser'. 
 * 
 * When authentication is done its builds a token from the specified username or 
 * password - or if they are not supplied it tries get it from LocalStorage.
 * 
 * If token is successfully built or retrieved authentication will progress - otherwise rejected.
 * When authentication progresses it will start by sending a request to <serviceurl>/system/authenticate 
 * with an 'Authorization' header carrying the token.
 * 
 * If responsestatus for this request is not '200', then the authentication is rejected. Otherwise it is 
 * considered successfull and will progress by storing token in LocalStorage(only if 'remember' is true),
 * applying authorization header as a default header for all subsequent requests, setting user at $rootScope.currentUser
 * and finally broadcasting 'login' with the user as a parameter.
 */
$btmod.factory('LoginSvc', ["$q", "localStorageService", "$http", "$rootScope", "blacktiger", "$log", function ($q, localStorageService, $http, $rootScope, blacktiger, $log) {
    var currentUser = null;
    return {
        authenticate: function (username, password, remember) {

            var user = null,
                    authHeader, token;

            if (!username && !password) {
                token = localStorageService.get('LoginToken');
            } else if (username && password) {
                token = btoa(username + ':' + password);
            }

            if (token) {
                authHeader = 'Basic ' + token;
                return $http.get(blacktiger.getServiceUrl() + 'system/authenticate', {
                    headers: {
                        'Authorization': authHeader
                    }
                }).then(function (response) {
                    if (response.status !== 200) {
                        var reason = response.status === 404 ? null : response.data;
                        if (!reason || '' === reason) {
                            reason = {
                                message: 'Unable to communicate with server'
                            };
                        }
                        localStorageService.remove('LoginToken');
                        console.info('Unable to authenticate: ' + reason.message);
                        return $q.reject('Unable to authenticate. Reason: ' + reason.message);
                    }

                    if (remember) {
                        localStorageService.add('LoginToken', token);
                    }

                    $rootScope.credentials = {
                        username: username,
                        password: password
                    };
                    user = response.data;

                    $log.info('Authenticatated. Returning user.');
                    $http.defaults.headers.common.Authorization = authHeader;

                    $log.info('Logged in as ' + user.username);
                    currentUser = user;
                    $rootScope.currentUser = user;
                    $rootScope.$broadcast('login', user);
                    return user;
                });
            } else {
                console.info('Unable to authenticate.');
                return $q.reject('No credentials specified or available for authentication.');
            }

        },
        getCurrentUser: function () {
            return currentUser;
        },
        deauthenticate: function () {
            $http.defaults.headers.common.Authorization = undefined;
            localStorageService.remove('LoginToken');
            $rootScope.$broadcast('logout', currentUser);
            currentUser = null;
            $rootScope.currentUser = null;
            $rootScope.$broadcast('afterLogout', currentUser);

        }
    };
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name MeetingSvc
 * @description
 * 
 * Service keeping state of all the active meetings available to the currently logged in user.
 * 
 * The service listens listens to evetns from the server and keeps its state of meetings up-to-date. 
 */
$btmod.factory('MeetingSvc', ["$rootScope", "PushEventSvc", "ParticipantSvc", "$log", function ($rootScope, PushEventSvc, ParticipantSvc, $log) {
    var rooms = [];

    var getRoomById = function (id) {
        $log.debug('Retrieving room by id [id=' + id + ']');
        var i;
        for (i = 0; i < rooms.length; i++) {
            if (rooms[i].id === id) {
                $log.debug('Room found');
                return rooms[i];
            }
        }
        return null;
    };

    var getParticipantFromRoomByChannel = function (room, channel) {
        var i;
        if (room && angular.isArray(room.participants)) {
            for (i = 0; i < room.participants.length; i++) {
                if (room.participants[i].channel === channel) {
                    return room.participants[i];
                }
            }
        }
        return null;
    };

    var getParticipantsCountByFilter = function (filter) {
        var i, e, count = 0, p;
        for (i = 0; i < rooms.length; i++) {
            for (e = 0; e < rooms[i].participants.length; e++) {
                p = rooms[i].participants[e];
                if (!angular.isDefined(filter) || filter(p) === true) {
                    count++;
                }
            }
        }
        return count;
    };

    var handleConfStart = function (event, room) {
        var existingRoom = getRoomById(room.id);
        $log.debug('ConfStartEvent [room=' + room + ']');
        if (existingRoom === null) {
            if (!angular.isArray(room.participants)) {
                room.participants = [];
            }
            rooms.push(room);
            $rootScope.$broadcast('Meeting.Start', room);
        }
    };

    var handleConfEnd = function (event, roomNo) {
        var room = getRoomById(roomNo);

        if (room !== null) {
            rooms.splice(rooms.indexOf(room), 1);
            $rootScope.$broadcast('Meeting.End', room);
        }
    };

    var handleJoin = function (event, roomNo, participant) {
        var room = getRoomById(roomNo);
        var existingParticipant = getParticipantFromRoomByChannel(room, participant.channel);

        if (existingParticipant === null) {
            room.participants.push(participant);
            $rootScope.$broadcast('Meeting.Join', room, participant);
        }
    };

    var handleChange = function (event, roomNo, participant) {
        var room = getRoomById(roomNo);
        var existingParticipant = getParticipantFromRoomByChannel(room, participant.channel);

        if (existingParticipant !== null) {
            existingParticipant.callerId = participant.callerId;
            existingParticipant.channel = participant.channel;
            existingParticipant.muted = participant.muted;
            existingParticipant.phoneNumber = participant.phoneNumber;
            existingParticipant.name = participant.name;
            existingParticipant.type = participant.type;
            existingParticipant.host = participant.host;
        }
    };

    var handleLeave = function (event, roomNo, channel) {
        var room = getRoomById(roomNo), i;
        var participant = getParticipantFromRoomByChannel(room, channel);

        if (participant !== null) {
            i = room.participants.indexOf(participant);
            room.participants.splice(i, 1);
            $rootScope.$broadcast('Meeting.Leave', room, participant);
        }
    };

    var handleCommentRequest = function (event, roomNo, channel) {
        var room = getRoomById(roomNo);
        var participant = getParticipantFromRoomByChannel(room, channel);

        if (participant !== null && !participant.commentRequested) {
            participant.commentRequested = true;
            $rootScope.$broadcast('Meeting.Change', room, participant);
        }
    };

    var handleCommentRequestCancel = function (event, roomNo, channel) {
        var room = getRoomById(roomNo);
        var participant = getParticipantFromRoomByChannel(room, channel);

        if (participant !== null && participant.commentRequested) {
            participant.commentRequested = false;
            $rootScope.$broadcast('Meeting.Change', room, participant);
        }
    };

    var handleMute = function (event, roomNo, channel) {
        var room = getRoomById(roomNo);
        var participant = getParticipantFromRoomByChannel(room, channel);

        if (participant !== null && !participant.muted) {
            participant.muted = true;
            $rootScope.$broadcast('Meeting.Change', room, participant);
        }
    };

    var handleUnmute = function (event, roomNo, channel) {
        var room = getRoomById(roomNo);
        var participant = getParticipantFromRoomByChannel(room, channel);

        if (participant !== null && participant.muted) {
            participant.muted = false;
            $rootScope.$broadcast('Meeting.Change', room, participant);
        }
    };

    var handlePhoneBookUpdate = function (event, number, name) {
        $log.debug('MeetingSvc:handlePhoneBookUpdate');
        angular.forEach(rooms, function (room) {
            angular.forEach(room.participants, function (participant) {
                if (number === participant.phoneNumber) {
                    participant.name = name;
                    $rootScope.$broadcast('Meeting.Change', room, participant);
                }
            });
        });

    };

    $rootScope.$on('PushEvent.ConferenceStart', handleConfStart);
    $rootScope.$on('PushEvent.ConferenceEnd', handleConfEnd);
    $rootScope.$on('PushEvent.Join', handleJoin);
    $rootScope.$on('PushEvent.Change', handleChange);
    $rootScope.$on('PushEvent.Leave', handleLeave);
    $rootScope.$on('PushEvent.CommentRequest', handleCommentRequest);
    $rootScope.$on('PushEvent.CommentRequestCancel', handleCommentRequestCancel);
    $rootScope.$on('PushEvent.Mute', handleMute);
    $rootScope.$on('PushEvent.Unmute', handleUnmute);
    $rootScope.$on('PhoneBook.Update', handlePhoneBookUpdate);

    return {
        getTotalParticipantsByCommentRequested: function (value) {
            return getParticipantsCountByFilter(function (participant) {
                return participant.host !== true && participant.commentRequested === value;
            });
        },
        getTotalParticipantsByMuted: function (value) {
            return getParticipantsCountByFilter(function (participant) {
                return participant.host !== true && participant.muted === value;
            });
        },
        getTotalParticipants: function () {
            return getParticipantsCountByFilter(function (participant) {
                return participant.host !== true;
            });
        },
        getTotalRooms: function () {
            return rooms.length;
        },
        getTotalParticipantsByType: function (type) {
            return getParticipantsCountByFilter(function (participant) {
                return participant.host !== true && participant.type === type;
            });
        },
        findAllIds: function () {
            var ids = [], i;
            for (i = 0; i < rooms.length; i++) {
                ids.push(rooms[i].id);
            }
            return ids;
        },
        hasRoom: function (id) {
            return getRoomById(id) !== null;
        },
        findRoom: function (id) {
            return getRoomById(id);
        },
        kickByRoomAndChannel: function (room, participant) {
            ParticipantSvc.kick(room, participant.channel);
        },
        muteByRoomAndChannel: function (room, participant) {
            ParticipantSvc.mute(room, participant.channel);
            participant.commentRequested = false;
        },
        unmuteByRoomAndChannel: function (room, participant) {
            ParticipantSvc.unmute(room, participant.channel);
            participant.commentRequested = false;
        }
    };
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name ParticipantSvc
 * @description
 * 
 * Service for retreiving participants currently in a room.
 */
$btmod.factory('ParticipantSvc', ["blacktiger", "$resource", "$log", "$http", function (blacktiger, $resource, $log, $http) {
    var resource = $resource(blacktiger.getServiceUrl() + 'rooms/:roomid/participants/:id');
    return {
        query: function (roomid) {
            return resource.query({
                roomid: roomid
            });
        },
        get: function (roomId, id) {
            return resource.get({
                roomid: roomId,
                id: id
            });
        },
        kick: function (roomId, id) {
            return resource.remove({
                roomid: roomId,
                id: id
            });
        },
        mute: function (roomId, id) {
            var data = {muted: true};
            $log.info('Muting participant: [room=' + roomId + ';id=' + id + ']');
            return $http.put(blacktiger.getServiceUrl() + 'rooms/' + roomId + '/participants/' + id, data).then(function () {
                return;
            });
        },
        unmute: function (roomId, id) {
            var data = {muted: false};
            $log.info('Unmuting participant: [room=' + roomId + ';id=' + id + ']');
            return $http.put(blacktiger.getServiceUrl() + 'rooms/' + roomId + '/participants/' + id, data).then(function () {
                return;
            });
        }
    };
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name PhoneBookSvc
 * @description
 * 
 * Service for updating names related to a phone number.
 */
$btmod.factory('PhoneBookSvc', ["$http", "blacktiger", "$rootScope", function ($http, blacktiger, $rootScope) {
    return {
        updateEntry: function (phoneNumber, name) {
            return $http.put(blacktiger.getServiceUrl() + 'phonebook/' + phoneNumber, name).then(function () {
                $rootScope.$broadcast('PhoneBook.Update', phoneNumber, name);
                return;
            });
        }
    };
}]);

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
$btmod.factory('PushEventSvc', ["$rootScope", "StompSvc", "RoomSvc", "blacktiger", "$log", "$q", function ($rootScope, StompSvc, RoomSvc, blacktiger, $log, $q) {
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
        var deferred = $q.defer();
        stompClient = StompSvc(blacktiger.getServiceUrl() + 'socket'); // jshint ignore:line
        stompClient.connect(null, null, function () {
            //+ currentRoom
            RoomSvc.query('full').$promise.then(function (result) {
                var rooms = [];
                angular.forEach(result, function (room) {
                    rooms.push(room);
                    $rootScope.$broadcast('PushEvent.ConferenceStart', room, true);
                });

                if (rooms.length === 1) {
                    stompClient.subscribe('/queue/events/' + rooms[0].id, function (message) {
                        var e = angular.fromJson(message.body);
                        handleEvent(e);
                    });
                } else if (rooms.length > 1) {
                    stompClient.subscribe('/queue/events/*', function (message) {
                        var e = angular.fromJson(message.body);
                        handleEvent(e);
                    });
                }

                $rootScope.$broadcast('PushEventSvc.Initialized');
                deferred.resolve();
            });

        }, function (error) {
            $rootScope.$broadcast('PushEventSvc.Lost_Connection', error);
            deferred.reject(error);
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
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name RoomSvc
 * @description
 * 
 * Service for retreiving the rooms the current user has access to.
 */
$btmod.factory('RoomSvc', ["blacktiger", "$resource", function (blacktiger, $resource) {
    var resource = $resource(blacktiger.getServiceUrl() + 'rooms/:id', {}, {
        put: {
            method: 'PUT'
        }
    });
    return {
        query: function (mode) {
            var params;
            if (mode) {
                params = {
                    mode: mode
                };
            }
            return resource.query(params);
        },
        get: function (id) {
            return resource.get({
                id: id
            });
        },
        save: function (room) {
            return resource.put({
                id: room.id
            }, room);
        },
        all: function () {
            return resource.all();
        }
    };
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name SipUserSvc
 * @description
 * 
 * Service for working with SIP user information.
 */
$btmod.factory('SipUserSvc', ["$http", "blacktiger", "$rootScope", "$q", function ($http, blacktiger, $rootScope, $q) {
    return {
        create: function (user) {
            return $http.post(blacktiger.getServiceUrl() + 'sipaccounts', user).then(function (response) {
                if (response.status !== 200) {
                    var message = response.data && response.data.message ? response.data.message : response.status;
                    return $q.reject(message);
                }
                return;
            });
        },
        get: function (key, number) {
            var data = {
                key: key
            };
            return $http({
                method: 'GET',
                url: blacktiger.getServiceUrl() + 'sipaccounts/' + number,
                params: data
            }).then(function (response) {
                if (response.status !== 200) {
                    var message = response.data && response.data.message ? response.data.message : response.status;
                    return $q.reject(message);
                }
                return response.data;
            });
        }
    };
}]);

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
$btmod.factory('StompSvc', ["$rootScope", function ($rootScope) {
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
}]);

/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name SystemSvc
 * @description
 * 
 * Service for retreiving information about the system.
 * 
 * This service exposes one method: 'getSystemInfo'.
 * getSystemInfo returns a promise that, when it is susccessfull, will hold an object with information about the system.
 * It will be retreived by requesting <serviceurl>/system/information.
 */
$btmod.factory('SystemSvc', ["$http", "blacktiger", function ($http, blacktiger) {
    return {
        getSystemInfo: function () {
            return $http.get(blacktiger.getServiceUrl() + 'system/information').success(function (data) {
                return data;
            }).error(function(data) {
                return data;
            });
        }
    };
}]);
