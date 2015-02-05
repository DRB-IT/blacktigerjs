'use strict';
describe('Unit testing SystemSvc', function () {
    var $rootScope;
    var SystemSvc;
    var blacktiger;
    var $httpBackend;
    var info = null;

    beforeEach(module('blacktiger'));

    beforeEach(inject(function (_$rootScope_, _$httpBackend_, _SystemSvc_, _blacktiger_) {
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        SystemSvc = _SystemSvc_;
        blacktiger = _blacktiger_;
    }));

    describe('async', function () {
        beforeEach(function (done) {
            $httpBackend.expectGET(blacktiger.getServiceUrl() + 'system/information').respond({
                cores: 24,
                load: {
                    disk: 25.0,
                    memory: 22.0,
                    cpu: 0.3,
                    net: 4.9
                },
                averageCpuLoad: {
                    oneMinute: 0.1,
                    fiveMinutes: 0.3,
                    tenMinutes: 2.0
                }
            });
            SystemSvc.getSystemInfo().then(function (_info_) {
                info = _info_;
                done();
            });
            $httpBackend.flush();
        });

        it('has info', function () {
            expect(info).not.toBe(null);
            expect(info.cores).toBe(24);
        });
    });


});
