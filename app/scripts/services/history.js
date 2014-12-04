'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.service:HistorySvc
 * @description
 * # HistorySvc
 * Service that holds historic information about calls made. 
 * 
 * This service does on purpose not deliver a reliable data base, as registering and keeping these information may be illegal in some countries.
 * Instead this service keeps information about the calls detected during the lifetime of the current browser instance only.
 * 
 * On every update this service will broadcast 'History.Updated' without any parameters.
 */
$btmod
        .factory('HistorySvc', function ($rootScope, $cookieStore, blacktiger, $log) {
            $log.debug("Initializing HistorySvc");
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
                $log.debug("Resetting history data");
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
                $log.debug("HistorySvc:handleConferenceStart");
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
            }

            var handleJoinEvent = function (event, roomNo, participant, resume) {
                $log.debug("HistorySvc:handleJoinEvent");
                var entries, entry, call, key, i;

                //Ignore the host. It will not be part of the history.
                if (participant.host) {
                    return;
                }

                if (!angular.isDefined(history[roomNo])) {
                    createRoomEntry(roomNo);
                }

                if (!angular.isDefined(participant.callerId)) {
                    throw "Participant does not have a callerId specified.";
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
                $log.debug("HistorySvc:handleLeaveEvent");
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
                        break;

                        entry.totalDuration = totalDurationForEntry(entry);
                    }
                }

                if (changed) {
                    $cookieStore.put(historyCookieName, history);
                    fireUpdated();
                }
            };

            var handlePhoneBookUpdate = function (event, number, name) {
                $log.debug("HistorySvc:handlePhoneBookUpdate");
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

                var array = [], key, entries, entry, _active, i, call, accepted, _room;
                $log.debug("Finding entries [room=" + room + ";callerId=" + callerId + ";active=" + active + "]");
                for (_room in history) {
                    if (!angular.isDefined(room) || room === _room) {
                        for (key in history[_room]) {
                            accepted = true;
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
                $log.debug("Found " + array.length + " entries");
                return array;
            }

            $rootScope.$on('PushEvent.ConferenceStart', handleConferenceStartEvent);
            $rootScope.$on('PushEvent.Join', handleJoinEvent);
            $rootScope.$on('PushEvent.Leave', handleLeaveEvent);
            $rootScope.$on('PhoneBook.Update', handlePhoneBookUpdate);

            return {
                getTotalDurationByRoomAndCallerId: function (room, callerId) {
                    var duration = 0, now, entries = doFind(angular.isObject(room) ? room.id : room, callerId);
                    if (entries && entries.length > 0) {
                        duration = totalDurationForEntry(entries[0]);
                    } else {
                        $log.debug("HistorySvc.getTotalDurationByRoomAndCallerId: No entry found [room=" + room + ";callerId=" + callerId + "]");
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
        });