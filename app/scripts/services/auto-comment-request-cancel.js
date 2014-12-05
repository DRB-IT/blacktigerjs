/*global $btmod*/
'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.service:AutoCommentRequestCancelSvc
 * @description
 * # AutoCommentRequestCancelSvc
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
$btmod.factory('AutoCommentRequestCancelSvc', function ($rootScope, $timeout, CONFIG, $log) {
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

});
