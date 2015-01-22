'use strict';
describe('Unit testing LoginSvc', function () {
    var $compile;
    var $rootScope;
    var LoginSvc;
    var $httpBackend;
    var blacktiger;
    var localStorageService;
    var $http;
    
    beforeEach(module('blacktiger'));

    beforeEach(inject(function (_$compile_, _$rootScope_, _LoginSvc_, _$httpBackend_, _$http_, _blacktiger_) {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        LoginSvc = _LoginSvc_;
        $httpBackend = _$httpBackend_;
        blacktiger = _blacktiger_;
        $http = _$http_;
    }));

    describe('sends an authentication request with username and password', function () {
        var username = 'john', password = 'doe';
        var user = null;

        beforeEach(function (done) {
            $httpBackend.expect('GET', blacktiger.getServiceUrl() + 'system/authenticate', undefined, function (headers) {
                return headers.Authorization === 'Basic am9objpkb2U=';
            }).respond({
                username: 'john',
                authtoken: 'qwerty',
                roles: ['ROLE_USER']
            });
            LoginSvc.authenticate(username, password).then(function (_user_) {
                console.log('Got user after authentication.');
                user = _user_;
                done();
            }, function (reason) {
                console.log(reason);
                done();
            });
            $httpBackend.flush();
        });

        it('has user set', function () {
            expect(user).not.toBe(null);
        });
    });

    describe('sends an authentication request with token from localStorage ', function () {
        var user = null;
        
    
        beforeEach(inject(function (_localStorageService_) {
            localStorageService = _localStorageService_;
        }));

        beforeEach(function (done) {
            localStorageService.add('LoginToken', 'am9objpkb2U=');
            $httpBackend.expect('GET', blacktiger.getServiceUrl() + 'system/authenticate', undefined, function (headers) {
                return headers.Authorization === 'Basic am9objpkb2U=';
            }).respond({
                username: 'john',
                authtoken: 'qwerty',
                roles: ['ROLE_USER']
            });
            console.log('Calling authenticate without arguments');
            LoginSvc.authenticate().then(function (_user_) {
                console.log('Got user after authentication. ' + _user_);
                user = _user_;
                done();
            }, function (reason) {
                console.log(reason);
                done();
            });
            $httpBackend.flush();
        });

        it('has user set', function () {
            expect(user).not.toBe(null);
        });

    });
    
    describe('does not send an authentication request to another host', function () {
        var username = 'john', password = 'doe';
        var user = null;
        var requestOk = false;

        beforeEach(function (done) {
            $httpBackend.expect('GET', blacktiger.getServiceUrl() + 'system/authenticate', undefined, function (headers) {
                return headers.Authorization === 'Basic am9objpkb2U=';
            }).respond({
                username: 'john',
                authtoken: 'qwerty',
                roles: ['ROLE_USER']
            });
            
            $httpBackend.expect('GET', 'http://unknown/system/authenticate', undefined, function (headers) {
                return headers.Authorization !== 'Basic am9objpkb2U=';
            }).respond({
                username: 'john',
                authtoken: 'qwerty',
                roles: ['ROLE_USER']
            });
            LoginSvc.authenticate(username, password).then(function (_user_) {
                console.log('Got user after authentication.');
                user = _user_;
                
            }, function (reason) {
                console.log(reason);
            });
            
            $http.get('http://unknown/system/authenticate').success(function() {
                requestOk = true;
                done();
            });
            $httpBackend.flush();
        });

        it('has user set', function () {
            expect(user).not.toBe(null);
            expect(requestOk).toBe(true);
        });
    });




});
