/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name RoomSvc
 * @description
 * 
 * Service for retreiving the rooms the current user has access to.
 */
$btmod.factory('RoomSvc', function (blacktiger, $resource) {
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
});
