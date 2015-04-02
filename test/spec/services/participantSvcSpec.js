'use strict';
describe('Unit testing ParticipantSvc', function() {
    var $rootScope;
    var $httpBackend;
    var ParticipantSvc;
    var RoomSvc;
    var $timeout;
    var blacktiger;

    beforeEach(module('blacktiger'));

    beforeEach(inject(function(_$rootScope_, _$httpBackend_, _ParticipantSvc_, _RoomSvc_, _$timeout_, _blacktiger_){
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        ParticipantSvc = _ParticipantSvc_;
        RoomSvc = _RoomSvc_;
        $timeout = _$timeout_;
        blacktiger = _blacktiger_;
    }));

    it('retreives participants.', function() {
        var participants = [
                    {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ];

        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants').respond(participants);
        participants = ParticipantSvc.query('DK-9000-2');
        $httpBackend.flush();
        expect(participants.length).toBe(1);

    });

    it('kick participant.', function() {
        var participants= [
                    {
                        userId: 1,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    },
                    {
                        userId: 2,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxxx',
                        dateJoined: 1349333576093,
                        name: 'Testsal',
                        commentRequested: false
                    }
                ];

        $httpBackend.expectDELETE(blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants/1').respond(function() {
            var participant = participants[0];
            participants.splice(0, 1);
            console.log('Kick request received as expected ' + participant);
            return [200];
        });

        ParticipantSvc.kick('DK-9000-2', '1');
        $httpBackend.flush();

        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants').respond(participants);
        participants = ParticipantSvc.query('DK-9000-2');
        $httpBackend.flush();

        expect(participants.length).toBe(1);


    });

    it('mutes participant.', function() {
        var participants= [
                    {
                        userId: 1,
                        muted: true,
                        host: false,
                        phoneNumber: 'PC-xxxxxxx1',
                        dateJoined: 1349333576093,
                        name: 'Testlistener',
                        commentRequested: false
                    },
                    {
                        userId: 2,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxx2',
                        dateJoined: 1349333576093,
                        name: 'Testhall',
                        commentRequested: false
                    }
                ];


        $httpBackend.expect('PUT', blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants/1').respond(function(method, url, data) {
            data = angular.fromJson(data);
            participants[0].muted = (data.muted === true);
            console.log('Mute request received as expected: ' + data);
            console.log(participants[0]);
            return [200];
        });

        ParticipantSvc.mute('DK-9000-2', '1');
        $httpBackend.flush();

        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants').respond(participants);
        participants = ParticipantSvc.query('DK-9000-2');
        $httpBackend.flush();

        expect(participants[0].muted).toBe(true);


    });

    it('unmutes participant.', function() {
        var participants= [
                    {
                        userId: 1,
                        muted: true,
                        host: false,
                        phoneNumber: 'PC-xxxxxxx1',
                        dateJoined: 1349333576093,
                        name: 'Testlistener',
                        commentRequested: false
                    },
                    {
                        userId: 2,
                        muted: false,
                        host: true,
                        phoneNumber: 'PC-xxxxxxx2',
                        dateJoined: 1349333576093,
                        name: 'Testhall',
                        commentRequested: false
                    }
                ];


        $httpBackend.expect('PUT', blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants/1').respond(function(method, url, data) {
            data = angular.fromJson(data);
            participants[0].muted = (data.muted === true);
            console.log('Mute request received as expected: ' + data);
            return [200];
        });

        ParticipantSvc.unmute('DK-9000-2', '1');
        $httpBackend.flush();

        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms/DK-9000-2/participants').respond(participants);
        participants = ParticipantSvc.query('DK-9000-2');
        $httpBackend.flush();

        expect(participants[0].muted).toBe(false);
    });
    
});
