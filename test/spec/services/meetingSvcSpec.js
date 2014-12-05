'use strict';
describe('Unit testing MeetingSvc', function() {
    var $rootScope;
    var meetingSvc;
    
    beforeEach(module('blacktiger-service'));
    
    beforeEach(inject(function(_$rootScope_, _MeetingSvc_){
        $rootScope = _$rootScope_;
        meetingSvc = _MeetingSvc_;
    }));

  
    it('initializes with no data.', function () {
        var entries = meetingSvc.findAllIds();
        expect(entries).toEqual([]);
    });
    
    it('returns the correct total via getTotalParticipants', function () {
        var room = {
            id: 'H45-0000'
        };
        
        var host = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334451',
            name: 'John Doe',
            channel: 'SIP__1231',
            host:true
        };
        var participant1 = {
            type: 'Sip',
            callerId: 'L00000001',
            phoneNumber: '4522334452',
            name: 'John Doe',
            channel: 'SIP__1232',
            host:false
        };
        var participant2 = {
            type: 'Phone',
            callerId: 'L00000002',
            phoneNumber: '4522334453',
            name: 'John Doe',
            channel: 'SIP__1233',
            host:false
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        expect(0).toEqual(meetingSvc.getTotalParticipants());
        
        $rootScope.$broadcast('PushEvent.Join', room.id, participant1);
        expect(1).toEqual(meetingSvc.getTotalParticipants());
        expect(0).toEqual(meetingSvc.getTotalParticipantsByType('Phone'));
        expect(1).toEqual(meetingSvc.getTotalParticipantsByType('Sip'));
        
        $rootScope.$broadcast('PushEvent.Join', room.id, host);
        expect(1).toEqual(meetingSvc.getTotalParticipants());
        expect(0).toEqual(meetingSvc.getTotalParticipantsByType('Phone'));
        expect(1).toEqual(meetingSvc.getTotalParticipantsByType('Sip'));
        
        $rootScope.$broadcast('PushEvent.Join', room.id, participant2);
        expect(2).toEqual(meetingSvc.getTotalParticipants());
        expect(1).toEqual(meetingSvc.getTotalParticipantsByType('Phone'));
        expect(1).toEqual(meetingSvc.getTotalParticipantsByType('Sip'));
        
    });
    
    it('returns the correct total via getTotalRooms', function () {
        var room1 = {
            id: 'H45-0000'
        };
        
        var room2= {
            id: 'H45-0001'
        };
        
        var room3 = {
            id: 'H45-0002'
        };
        
        
        expect(0).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room1);
        expect(1).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room2);
        expect(2).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room3);
        expect(3).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceEnd', room3.id);
        expect(2).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceEnd', room2.id);
        expect(1).toEqual(meetingSvc.getTotalRooms());
        
        $rootScope.$broadcast('PushEvent.ConferenceEnd', room1.id);
        expect(0).toEqual(meetingSvc.getTotalRooms());
    });
    
    it('can return a room after conference started', function () {
        var room = {
            id: 'H45-0000'
        };
        
        expect(meetingSvc.findRoom(room.id)).toBe(null);
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        expect(meetingSvc.findRoom(room.id)).toEqual(room);
    });
    
    it('fires the correct events', function () {
        var lastEvent = null;
        var room = {
            id: 'H45-0000'
        };
        
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334451',
            name: 'John Doe',
            channel: 'SIP__1231',
            host:false,
            muted: true
        };
        
        function handleEvent(event) {
            lastEvent = event;
        }
        
        $rootScope.$on('Meeting.Start', handleEvent);
        $rootScope.$on('Meeting.End', handleEvent);
        $rootScope.$on('Meeting.Join', handleEvent);
        $rootScope.$on('Meeting.Leave', handleEvent);
        $rootScope.$on('Meeting.Change', handleEvent);
        
        //ConferenceStart
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        expect(lastEvent.name).toEqual('Meeting.Start');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        expect(lastEvent).toBe(null);
        
        //Join
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        expect(lastEvent.name).toEqual('Meeting.Join');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        expect(lastEvent).toBe(null);
        
        //CommentRequest
        $rootScope.$broadcast('PushEvent.CommentRequest', room.id, participant.channel);
        expect(lastEvent.name).toEqual('Meeting.Change');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.CommentRequest', room.id, participant.channel);
        expect(lastEvent).toBe(null);
        
        //CommentRequestCancel
        $rootScope.$broadcast('PushEvent.CommentRequestCancel', room.id, participant.channel);
        expect(lastEvent.name).toEqual('Meeting.Change');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.CommentRequestCancel', room.id, participant.channel);
        expect(lastEvent).toBe(null);
        
        //Unmuted
        $rootScope.$broadcast('PushEvent.Unmute', room.id, participant.channel);
        expect(lastEvent.name).toEqual('Meeting.Change');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.Unmute', room.id, participant.channel);
        expect(lastEvent).toBe(null);
        
        //Muted
        $rootScope.$broadcast('PushEvent.Mute', room.id, participant.channel);
        expect(lastEvent.name).toEqual('Meeting.Change');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.Mute', room.id, participant.channel);
        expect(lastEvent).toBe(null);
                
        //ConferenceEnd
        $rootScope.$broadcast('PushEvent.ConferenceEnd', room.id);
        expect(lastEvent.name).toEqual('Meeting.End');
        
        lastEvent = null;
        $rootScope.$broadcast('PushEvent.ConferenceEnd', room.id);
        expect(lastEvent).toBe(null);
        
    });
    
    it('handles PhoneBook.Update events', function () {
        var room = {
            id:'H45-0000'
        };
        var participant = {
            type: 'Sip',
            callerId: 'L00000000',
            phoneNumber: '4522334455',
            name: 'John Doe',
            channel: 'SIP__1234'
        };
        
        $rootScope.$broadcast('PushEvent.ConferenceStart', room);
        $rootScope.$broadcast('PushEvent.Join', room.id, participant);
        expect(meetingSvc.findRoom(room.id).participants[0].name).toEqual('John Doe');

        $rootScope.$broadcast('PhoneBook.Update', participant.phoneNumber, 'Jane Doe');
        expect(meetingSvc.findRoom(room.id).participants[0].name).toEqual('Jane Doe');
    });
   
});

