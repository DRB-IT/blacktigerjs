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
$btmod.factory('MeetingSvc', function ($rootScope, PushEventSvc, ParticipantSvc, $log) {
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
    
    var handleInitializing = function() {
        rooms = [];
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

    $rootScope.$on('PushEvent.Initializing', handleInitializing);
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
});
