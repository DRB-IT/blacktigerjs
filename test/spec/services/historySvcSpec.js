
'use strict';
describe('Unit testing HistorySvc', function () {
    var historySvc, $rootScope, $log;

    beforeEach(module('blacktiger'));

    beforeEach(module(function ($logProvider) {
        $logProvider.debugEnabled = true;
    }));

    beforeEach(inject(function (_$rootScope_, _HistorySvc_, _$log_) {
        historySvc = _HistorySvc_;
        $rootScope = _$rootScope_;
        $log = _$log_;
        $rootScope.$broadcast('PushEvent.ConferenceStart', {id: 'H45-0000'});
    }));

    it('initializes with no data.', function () {
        var entries = historySvc.findAll();
        expect(entries).toEqual([]);
    });

    it('adds participants to the correct room when a PushEvent.Join is broadcast.', function () {
        var room = 'H45-0000';
        var timestamp = '2015-01-01T12:00:00Z';
        var dateJoined = Date.parse(timestamp);
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234',
            dateJoined: timestamp
        };
        $log.debug('Broadcasting PushEvent.Join');
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        var entries = historySvc.findAllByRoom(room);
        expect(entries.length).toEqual(1);
        expect(entries[0].name).toEqual('John Doe');
        expect(entries[0].firstCall).toEqual(dateJoined);
        expect(historySvc.findAllByRoom('NOROOM').length).toEqual(0);
        expect(historySvc.findAll().length).toEqual(1);
    });

    it('Marks participants inactive when a PushEvent.Leave is broadcast.', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        $log.debug('Broadcasting PushEvent.Join');
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        expect(historySvc.findAll().length).toEqual(1);
        expect(historySvc.findAllByRoom(room).length).toEqual(1);
        expect(historySvc.findAllByRoomAndActive(room, false).length).toEqual(0);

        $rootScope.$broadcast('PushEvent.Leave', 'H45-0000', participant.channel);
        expect(historySvc.findAll().length).toEqual(1);
        expect(historySvc.findAllByRoom(room).length).toEqual(1);
        expect(historySvc.findAllByRoomAndActive(room, false).length).toEqual(1);
    });

    it('can contain 250 participants.', function () {
        for (var i = 0; i < 250; i++) {
            var participant = {
                type: 'Sip',
                callerId: 'L' + i,
                phoneNumber: '45' + i,
                name: 'John Doe #' + i
            };
            $rootScope.$broadcast('PushEvent.Join', 'H45-0000', participant);
        }
        var entries = historySvc.findAll();
        expect(entries.length).toEqual(250);
    });

    it('can retrieve participant by callerId', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        $log.debug('Broadcasting PushEvent.Join');
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        var entry = historySvc.findOneByRoomAndCallerId(room, participant.callerId);
        expect(entry.name).toEqual('John Doe');
    });

    it('handles calls from same phonenumber but different callerIds correctly', function () {
        var room = 'H45-0000';
        var participant1 = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        var participant2 = {
            type: 'Phone',
            callerId: '4522334455',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1235'
        };
        $log.debug('Broadcasting PushEvent.Join');
        $rootScope.$broadcast('PushEvent.Join', room, participant1);
        $rootScope.$broadcast('PushEvent.Join', room, participant2);
        expect(historySvc.findAll().length).toEqual(2);
        expect(historySvc.findAllByActive(false).length).toEqual(0);

        $rootScope.$broadcast('PushEvent.Leave', room, participant1.channel);
        expect(historySvc.findAll().length).toEqual(2);
        expect(historySvc.findAllByActive(false).length).toEqual(1);

        $rootScope.$broadcast('PushEvent.Leave', room, participant2.channel);
        expect(historySvc.findAll().length).toEqual(2);
        expect(historySvc.findAllByActive(false).length).toEqual(2);

        $rootScope.$broadcast('PushEvent.Join', room, participant1);
        expect(historySvc.findAll().length).toEqual(2);
        expect(historySvc.findAllByActive(false).length).toEqual(1);

        $rootScope.$broadcast('PushEvent.Join', room, participant2);
        expect(historySvc.findAll().length).toEqual(2);
        expect(historySvc.findAllByActive(false).length).toEqual(0);
    });

    it('can delete the history', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        $log.debug('Broadcasting PushEvent.Join');
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        expect(historySvc.findAll().length).toEqual(1);

        historySvc.deleteAll();
        expect(historySvc.findAll().length).toEqual(0);
    });

    it('handles PhoneBook.Update events', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        expect(historySvc.findOneByRoomAndCallerId(room, participant.callerId).name).toEqual('John Doe');

        $rootScope.$broadcast('PhoneBook.Update', participant.phoneNumber, 'Jane Doe');
        expect(historySvc.findOneByRoomAndCallerId(room, participant.callerId).name).toEqual('Jane Doe');
    });

    it('exposes the history cookie name', function () {
        expect(historySvc.getCookieName()).not.toBe(null);
    });

    it('handles synchronizes history data with events sent on PushEventSvc connect.', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        var participant2 = {
            type: 'Sip',
            callerId: 'L00000001',
            phoneNumber: '4522334455',
            name: 'Jane Doe',
            channel: 'SIP__1235'
        };

        //Imitate joins and ensure their calls are correct
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        $rootScope.$broadcast('PushEvent.Join', room, participant2);
        var entry = historySvc.findOneByRoomAndCallerId(room, participant.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).toBe(null);

        entry = historySvc.findOneByRoomAndCallerId(room, participant2.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).toBe(null);

        //Imitate one leave and ensure both participant's calls are correct
        $rootScope.$broadcast('PushEvent.Leave', room, participant.channel);
        entry = historySvc.findOneByRoomAndCallerId(room, participant.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).not.toBe(null);

        entry = historySvc.findOneByRoomAndCallerId(room, participant2.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).toBe(null);

        //Imitate a reinitializing ConferenceStart event and make sure existing calls were resumed instead of new calls created
        $rootScope.$broadcast('PushEvent.ConferenceStart', {id: room, participants: [participant, participant2]}, true);
        entry = historySvc.findOneByRoomAndCallerId(room, participant.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).toBe(null);

        entry = historySvc.findOneByRoomAndCallerId(room, participant2.callerId);
        expect(entry.calls.length).toEqual(1);
        expect(entry.calls[0].end).toBe(null);

    });


    it('recovers well when history has been deleted during active calls', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        var participant2 = {
            type: 'Sip',
            callerId: 'L00000001',
            phoneNumber: '4522334455',
            name: 'Jane Doe',
            channel: 'SIP__1235'
        };

        $rootScope.$broadcast('PushEvent.Join', room, participant);
        $rootScope.$broadcast('PushEvent.Join', room, participant2);

        var entries = historySvc.findAll();
        expect(entries.length).toEqual(2);

        historySvc.deleteAll();
        entries = historySvc.findAll();
        expect(entries.length).toEqual(0);

        $rootScope.$broadcast('PushEvent.Leave', room, participant);
        $rootScope.$broadcast('PushEvent.Leave', room, participant2);
        entries = historySvc.findAll();
        expect(entries.length).toEqual(0);

        $rootScope.$broadcast('PushEvent.Join', room, participant);
        $rootScope.$broadcast('PushEvent.Join', room, participant2);
        $rootScope.$broadcast('PushEvent.Leave', room, participant);
        $rootScope.$broadcast('PushEvent.Leave', room, participant2);
        entries = historySvc.findAll();
        expect(entries.length).toEqual(2);
    });

    it('handles receiving only sporadic events', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        $rootScope.$broadcast('PushEvent.Join', room, participant);
        $rootScope.$broadcast('PushEvent.Join', room, participant);

        expect(historySvc.findAll().length).toEqual(1);
        expect(historySvc.findAllByActive(false).length).toEqual(0);

        $rootScope.$broadcast('PushEvent.Leave', room, participant.channel);

        expect(historySvc.findAll().length).toEqual(1);
        expect(historySvc.findAllByActive(false).length).toEqual(1);


    });

    
    describe('can calculate total duration of all calls for a callerid', function () {
        var room = 'H45-0000';
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };

        beforeEach(function (done) {
            $rootScope.$broadcast('PushEvent.Join', room, participant);
            setTimeout(function () {
                $rootScope.$broadcast('PushEvent.Leave', room, participant.callerId);
                done();
            }, 500);
        });

        it('has taken at least 499 ms', function () {
            var duration = historySvc.getTotalDurationByRoomAndCallerId(room, participant.callerId);
            expect(duration).toBeGreaterThan(499);
        });



    });
});
