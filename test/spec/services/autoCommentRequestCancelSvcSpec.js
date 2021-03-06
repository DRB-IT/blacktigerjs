'use strict';
describe('Unit testing AutoCommentRequestCancelSvc', function () {
    var $rootScope;
    var autoCommentRequestCancelSvc;
    var $timeout;
    var timeout = 100;

    beforeEach(module('blacktiger', function ($provide) {
        $provide.value('CONFIG', {
            commentRequestTimeout: timeout
        });
    }));

    beforeEach(inject(function (_$rootScope_, _AutoCommentRequestCancelSvc_, _$timeout_) {
        autoCommentRequestCancelSvc = _AutoCommentRequestCancelSvc_;
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;

        autoCommentRequestCancelSvc.start();
    }));

    it('emits a CommentRequestCancelEvent after timeout', function () {
        var room = 'H45-0000';
        var channel = 'SIP___1234';
        var cancelReceived = false;

        $rootScope.$on('PushEvent.CommentRequestCancel', function () {
            cancelReceived = true;
        });

        $rootScope.$broadcast('PushEvent.CommentRequest', room, channel);
        $timeout.flush();

        expect(cancelReceived).toBe(true);

    });
    
    it('emits a CommentRequestCancelEvent after MuteEvent if Comment has recently been requested', function () {
        var room = 'H45-0000';
        var channel = 'SIP___1234';
        var cancelReceived = false;

        $rootScope.$on('PushEvent.CommentRequestCancel', function () {
            cancelReceived = true;
        });

        $rootScope.$broadcast('PushEvent.CommentRequest', room, channel);
        $rootScope.$broadcast('PushEvent.Mute', room, channel);

        expect(cancelReceived).toBe(true);

    });

});
