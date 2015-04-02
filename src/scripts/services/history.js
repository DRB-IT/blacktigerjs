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
$btmod.factory('HistorySvc', function ($rootScope, localStorageService, blacktiger, $log) {
    $log.debug('Initializing HistorySvc');
    var historyVariableName = 'meetingHistory-' + blacktiger.getInstanceId();
    var history = localStorageService.get(historyVariableName);

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

    var cleanHistory = function (keepActiveCalls) {
        $log.debug('Resetting history data [keepActiveCalls=' + keepActiveCalls + ']');
        if(keepActiveCalls) {
            
            angular.forEach(history, function(room, key) {
                var entriesToDelete = [], i;
                angular.forEach(room, function(entry, key) {
                    for(i=entry.calls.length-1;i>=0;i--) {
                        if(entry.calls[i].end !== null) {
                            entry.calls.splice(i,1);
                        }
                    }
                    
                    if(entry.calls.length === 0) {
                        entriesToDelete.push(key);
                    } else {
                        entry.firstCall = entry.calls[0].start.getTime();
                    }
                });
                
                for(i=0;i<entriesToDelete.length;i++) {
                    delete room[entriesToDelete[i]];
                }
            });
        } else {
            history = {};
        }
        localStorageService.set(historyVariableName, history);
        fireUpdated();
    };

    if (!history || !angular.isObject(history)) {
        cleanHistory(false);
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
        var entries, entry, call, key, timestamp = new Date().getTime();
        
        if(participant.millisSinceJoin) {
            timestamp -= participant.millisSinceJoin;
        }

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
                firstCall: timestamp,
                calls: [],
                channel: participant.channel,
                totalDuration: 0
            };
            entries[key] = entry;
        } else {
            entry = entries[key];
            entry.channel = participant.channel;
            entry.name = participant.name;
        }

        if (resume && entry.calls.length > 0) {
            $log.debug('Resuming last call in call list for participant.');
            entry.calls[entry.calls.length - 1].end = null;
        } else {
            $log.debug('Appending new call to call list for participant.');
            call = {
                start: timestamp,
                end: null
            };
            entry.calls.push(call);
        }

        $log.debug('Persisting history.');
        localStorageService.set(historyVariableName, history);
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
            localStorageService.set(historyVariableName, history);
            fireUpdated();
        }
    };

    var handleChangeEvent = function(event, roomNo, participant) {
        handlePhoneBookUpdate(event, participant.phoneNumber, participant.name);
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
        localStorageService.set(historyVariableName, history);
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
    $rootScope.$on('PushEvent.Change', handleChangeEvent);
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
        deleteAll: function (keepActiveCalls) {
            cleanHistory(keepActiveCalls);
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
        getVariableName: function () {
            return historyVariableName;
        }
    };
});
