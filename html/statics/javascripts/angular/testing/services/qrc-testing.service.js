(function () {
    'use strict';
    angular.module('qrc-center.testing.services').factory('QRCTesting', QRCTesting);

    QRCTesting.$inject = ['$http', '$q', 'QRCTestingTokenInjector'];
    function QRCTesting($http, $q, QRCTestingTokenInjector) {
        var ipAddress = null;
        var authToken = null;
        var defaultConfig = {
            timeout: 7000, // shorten the http request timeout to 7sec
        }

        var QRCTesting = {
            // Followings are only utils
            setTargetIpAddress: setTargetIpAddress,
            getHashCode: getHashCode,
            setTargetAuthToken: setTargetAuthToken,

            // Followings are QRCTesting API
            getV1Path: getV1Path,
            postV1Path: postV1Path,
            getToken: getToken,
            getInfo: getInfo,

        };
        return QRCTesting;

        // Followings are only utils

        function getHashCode(value) {
            var hash = 0;
            if (value.length == 0) return hash;
            for (var i = 0; i < value.length; i++) {
                var char = value.charCodeAt(i);
                hash = ((hash<<5)-hash)+char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        }
        function setTargetIpAddress(ip_address) {
            ipAddress = ip_address;
        }

        function setTargetAuthToken(token) {
            authToken = token;
            QRCTestingTokenInjector.setToken(token);
        }

        // Followings are Provider Functions

        function getV1Path(path) {
            var url = buildUrl("/v1" + path);
            return $http.get(url, defaultConfig);            
        }

        function postV1Path(path, jsonValue) {
            var url = buildUrl("/v1" + path);
            return $http.post(url, jsonValue, defaultConfig);
        }

        function getToken(password_input) {
            var url = buildUrl("/v1/oauth2/token");
            return $http.post(url, {
                grant_type: "password",
                username: "admin",
                password: password_input},
                             defaultConfig);
        }
        function getInfo() {
            var url = buildUrl("/v1/info");
            return $http.get(url, defaultConfig);
        }


        // Followings are Internal Functions

        function buildUrl(path) {
            var url = "";
            if (ipAddress != null) {
                url = "http://" + ipAddress + path;
            } else {
                throw new Error("ipAddress is not set!");
            }
            return url;
        }
    }

    angular.module('qrc-center.testing.services').factory('QRCTestingTokenInjector', QRCTestingTokenInjector);
    QRCTestingTokenInjector.$inject = [];
    function QRCTestingTokenInjector() {
        var bearerToken;
        var QRCTestingTokenInjector = {
            setToken: setToken,
            request: function(req) {
                if (!req.headers.Authorization && bearerToken) {
                    req.headers.Authorization = bearerToken;
                }
                return req;
            }
        };
        return QRCTestingTokenInjector;

        function setToken(token) {
            bearerToken = "Bearer " + token;
        }
    }

    angular.module('qrc-center.testing.services').config(config);
    config.$inject = ['$httpProvider'];
    function config($httpProvider) {
        $httpProvider.interceptors.push('QRCTestingTokenInjector');
    }
})();