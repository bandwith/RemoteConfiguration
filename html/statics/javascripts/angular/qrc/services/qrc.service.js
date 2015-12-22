(function () {
    'use strict';
    angular.module('qrc.services').factory('QRC', QRC);

    QRC.$inject = ['$http', '$q', 'QRCTokenInjector'];
    function QRC($http, $q, QRCTokenInjector) {
        var ipAddress = null;
        var authToken = null;
        var defaultConfig = {
            timeout: 5000, // shorten the http request timeout to 5 sec, it is long enough for LAN.
        }

        var QRC = {
            // Followings are only utils
            setTargetIpAddress: setTargetIpAddress,
            getHashCode: getHashCode,
            setTargetAuthToken: setTargetAuthToken,

            // Followings are QRC API
            getPublicInfo: getPublicInfo,
            getToken: getToken,
            getInfo: getInfo,

            listSettings: listSettings,
            setSettings: setSettings,
            getSettings: getSettings,

            setWifState: setWifState,
            getWifiScanResults: getWifiScanResults,

            setProp: setProp,
            listProp: listProp,

            setSecurityPassword: setSecurityPassword,

            listAudioVolume: listAudioVolume,
            setAudioVolume: setAudioVolume,

        };
        return QRC;

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
            ipAddress = ip_address + ":8080";
        }

        function setTargetAuthToken(token) {
            authToken = token;
            QRCTokenInjector.setToken(token);
        }

        // Followings are QRC API

        function getPublicInfo(key) {
            var url = buildUrl("/v1/public/info?key=" + key);
            return $http.get(url, defaultConfig);
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

        function listSettings() {
            var url = buildUrl("/v1/settings");
            return $http.get(url, defaultConfig);
        }
        function setSettings(key, value) {
            var url = buildUrl("/v1/settings/" + key);
            return $http.post(url, {
                "value": value}, defaultConfig);
        }
        function getSettings(key) {
            var url = buildUrl("/v1/settings/" + key);
            return $http.get(url, defaultConfig);
        }

        function getWifiScanResults() {
            var url = buildUrl("/v1/wifi/scan_results");
            return $http.get(url, defaultConfig);
        }

        function setWifState(state) {
            var stateStr = (state != 0)? "enabled" : "disabled";
            var url = buildUrl("/v1/wifi/state");
            return $http.post(url, {
                "value": stateStr}, defaultConfig);
        }

        function setProp(prop, value) {
            var url = buildUrl("/v1/prop/" + prop);
            return $http.post(url, {
                "value": value}, defaultConfig);
        }
        function listProp() {
            var url = buildUrl("/v1/prop");
            return $http.get(url, defaultConfig);
        }

        function setSecurityPassword(value) {
            var url = buildUrl("/v1/user/password");
            return $http.post(url, {
                "value": value}, defaultConfig);
        }

        function listAudioVolume() {
            var url = buildUrl("/v1/audio/volume");
            return $http.get(url, defaultConfig);
        }

        function setAudioVolume(streamType, value) {
            var url = buildUrl("/v1/audio/volume/" + streamType);
            return $http.post(url, {
                "value": value}, defaultConfig);
        }

        function buildUrl(path) {
            var url = "";
            if (ipAddress != null) {
                url = "http://" + ipAddress + path;
            }
            return url;
        }
    }

    angular.module('qrc.services').factory('QRCTokenInjector', QRCTokenInjector);
    QRCTokenInjector.$inject = [];
    function QRCTokenInjector() {
        var bearerToken;
        var QRCTokenInjector = {
            setToken: setToken,
            request: function(req) {
                if (!req.headers.Authorization && bearerToken) {
                    req.headers.Authorization = bearerToken;
                }
                return req;
            }
        };
        return QRCTokenInjector;

        function setToken(token) {
            bearerToken = "Bearer " + token;
        }
    }

    angular.module('qrc.services').config(config);
    config.$inject = ['$httpProvider'];
    function config($httpProvider) {
        $httpProvider.interceptors.push('QRCTokenInjector');
    }
})();