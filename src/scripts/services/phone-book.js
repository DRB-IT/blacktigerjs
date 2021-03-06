/*global $btmod*/
'use strict';

/**
 * @memberOf! blacktiger#
 * @name PhoneBookSvc
 * @description
 * 
 * Service for updating names related to a phone number.
 */
$btmod.factory('PhoneBookSvc', function ($http, blacktiger, $rootScope) {
    return {
        updateEntry: function (phoneNumber, name) {
            return $http.put(blacktiger.getServiceUrl() + 'phonebook/' + phoneNumber, name).then(function () {
                $rootScope.$broadcast('PhoneBook.Update', phoneNumber, name);
                return;
            });
        }
    };
});
