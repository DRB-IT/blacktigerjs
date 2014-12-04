'use strict';

/**
 * @ngdoc function
 * @name blacktigerjs.service:LoginSvc
 * @description
 * # LoginSvc
 * Service for handling Login.
 * 
 * Exposes the methods 'authenticate', 'deauthenticate' and 'getCurrentUser'. 
 * 
 * When authentication is done its builds a token from the specified username or 
 * password - or if they are not supplied it tries get it from LocalStorage.
 * 
 * If token is successfully built or retrieved authentication will progress - otherwise rejected.
 * When authentication progresses it will start by sending a request to <serviceurl>/system/authenticate 
 * with an 'Authorization' header carrying the token.
 * 
 * If responsestatus for this request is not '200', then the authentication is rejected. Otherwise it is 
 * considered successfull and will progress by storing token in LocalStorage(only if 'remember' is true),
 * applying authorization header as a default header for all subsequent requests, setting user at $rootScope.currentUser
 * and finally broadcasting 'login' with the user as a parameter.
 */
$btmod
        .factory('LoginSvc', function ($q, localStorageService, $http, $rootScope, blacktiger, $log) {
            var currentUser = null;
            return {
                authenticate: function (username, password, remember) {

                    var user = null,
                            authHeader, token;

                    if (!username && !password) {
                        token = localStorageService.get('LoginToken');
                    } else if (username && password) {
                        token = btoa(username + ':' + password);
                    }

                    if (token) {
                        authHeader = 'Basic ' + token;
                        return $http.get(blacktiger.getServiceUrl() + "system/authenticate", {
                            headers: {
                                'Authorization': authHeader
                            }
                        }).then(function (response) {
                            if (response.status !== 200) {
                                var reason = response.status == 404 ? null : response.data;
                                if (!reason || '' === reason) {
                                    reason = {
                                        message: 'Unable to communicate with server'
                                    };
                                }
                                localStorageService.remove('LoginToken');
                                console.info('Unable to authenticate: ' + reason.message);
                                return $q.reject('Unable to authenticate. Reason: ' + reason.message);
                            }

                            if (remember) {
                                localStorageService.add('LoginToken', token);
                            }

                            $rootScope.credentials = {
                                username: username,
                                password: password
                            };
                            user = response.data;

                            $log.info('Authenticatated. Returning user.');
                            $http.defaults.headers.common.Authorization = authHeader;

                            $log.info('Logged in as ' + user.username);
                            currentUser = user;
                            $rootScope.currentUser = user;
                            $rootScope.$broadcast("login", user);
                            return user;
                        });
                    } else {
                        console.info('Unable to authenticate.');
                        return $q.reject('No credentials specified or available for authentication.');
                    }

                },
                getCurrentUser: function () {
                    return currentUser;
                },
                deauthenticate: function () {
                    $http.defaults.headers.common.Authorization = undefined;
                    localStorageService.remove('LoginToken');
                    $rootScope.$broadcast("logout", currentUser);
                    currentUser = null;
                    $rootScope.currentUser = null;
                    $rootScope.$broadcast("afterLogout", currentUser);

                }
            };
        });
