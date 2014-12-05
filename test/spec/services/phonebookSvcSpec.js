'use strict';
describe('Unit testing PhoneBookSvc', function() {
    var PhoneBookSvc, $httpBackend, blacktiger, $rootScope;
    
    beforeEach(module('blacktiger-service'));
    beforeEach(module(function($logProvider) {
        $logProvider.debugEnabled = true;
    }));
    
    beforeEach(inject(function(_PhoneBookSvc_, _$httpBackend_, _blacktiger_, _$rootScope_){
        PhoneBookSvc = _PhoneBookSvc_;
        $httpBackend = _$httpBackend_;
        blacktiger = _blacktiger_;
        $rootScope = _$rootScope_;
    }));
    
    it('broadcasts change event on successfull change', function() {
        var number = '+4512345678', name = 'John Doe', eventReceived = false;
        $httpBackend.whenPUT(blacktiger.getServiceUrl() + 'phonebook/' + number, name).respond();
        $rootScope.$on('PhoneBook.Update', function(event, newNumber, newName) {
           if(newNumber === number && newName === name) {
               eventReceived = true;
           } 
        });
        PhoneBookSvc.updateEntry(number, name);
        $httpBackend.flush();
        expect(eventReceived).toBe(true);
    });

});

