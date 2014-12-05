'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.service:ParticipantSvc
 * @description
 * # ParticipantSvc
 * Service for retreiving participants currently in a room.
 */
$btmod.factory('ParticipantSvc', function (blacktiger, $resource, $log, $http) {
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
});
