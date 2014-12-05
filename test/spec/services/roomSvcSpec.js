'use strict';
describe('Unit testing RoomSvc', function() {
    var RoomSvc;
    var $httpBackend;
    var blacktiger;

    beforeEach(module('blacktiger-service'));

    beforeEach(inject(function(_RoomSvc_, _$httpBackend_, _blacktiger_){
        RoomSvc = _RoomSvc_;
        $httpBackend = _$httpBackend_;
        blacktiger = _blacktiger_;
    }));



    it('retreives room objects', function() {
        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms').respond([{
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                ]
            }]);

        var rooms = null;

        rooms = RoomSvc.query();

        $httpBackend.flush();
        expect(rooms[0].id).toBe('DK-9000-2');
        expect(rooms[0].name).toBe('DK-9000-1 Aalborg, sal 2');
        expect(rooms[0].contact.name).toBe('John Doe');
        expect(rooms[0].participants.length).toBe(0);
        expect(rooms.length).toBe(1);
    });

    it('retreives specific room object', function() {
        $httpBackend.expectGET(blacktiger.getServiceUrl() + 'rooms/DK-9000-2').respond({
                id: 'DK-9000-2',
                name: 'DK-9000-1 Aalborg, sal 2',
                contact: {
                    name: 'John Doe',
                    phoneNumber: '+4512345678',
                    email: 'example@mail.dk'
                },
                participants: [
                ]
            });

        var room = null;

        room = RoomSvc.get('DK-9000-2');

        $httpBackend.flush();

        expect(room.id).toBe('DK-9000-2');
        expect(room.name).toBe('DK-9000-1 Aalborg, sal 2');
        expect(room.contact.name).toBe('John Doe');
        expect(room.participants.length).toBe(0);
    });


});
