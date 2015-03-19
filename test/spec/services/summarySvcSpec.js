'use strict';
describe('Unit testing SummarySvc', function () {
    var $rootScope;
    var SummarySvc;
    var blacktiger;
    var $httpBackend;
    var info = null;

    beforeEach(module('blacktiger'));

    beforeEach(inject(function (_$rootScope_, _$httpBackend_, _SummarySvc_, _blacktiger_) {
        $rootScope = _$rootScope_;
        $httpBackend = _$httpBackend_;
        SummarySvc = _SummarySvc_;
        blacktiger = _blacktiger_;
    }));

    describe('async', function () {
        beforeEach(function (done) {
            $httpBackend.expectGET(blacktiger.getServiceUrl() + 'system/summary').respond({
                all: {
                    halls: 2,
                    participants: 2,
                    participantsViaPhone: 0,
                    participantsViaSip: 2,
                    openMicrophones: 1
                },
                H45: {
                    halls: 1,
                    participants: 1,
                    participantsViaPhone: 0,
                    participantsViaSip: 1,
                    openMicrophones: 0
                },
                H46: {
                    halls: 1,
                    participants: 1,
                    participantsViaPhone: 0,
                    participantsViaSip: 1,
                    openMicrophones: 1
                }
            });
            SummarySvc.getSummary().then(function (_info_) {
                info = _info_;
                done();
            });
            $httpBackend.flush();
        });

        it('has info', function () {
            expect(info).not.toBe(null);
            expect(info.all.halls).toBe(2);
        });
    });


});
