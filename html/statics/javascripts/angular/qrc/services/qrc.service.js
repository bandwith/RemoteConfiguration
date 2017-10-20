(function () {
    'use strict';
    angular.module('qrc.services').factory('QRC', QRC);

    QRC.$inject = ['$http', '$q'/*, 'QRCTokenInjector'*/];
    function QRC($http, $q/*, QRCTokenInjector*/) {
        var ipAddress = {};
        var authToken = {};
        var defaultTimeout = 10000; // shorten the http request timeout to 5 sec, it is long enough for LAN.
        var defaultConfig = {
            timeout: defaultTimeout, 
        }

        var QRC = {
            getTokenVal: function(idx) {
                return authToken[idx];
            },

            // Followings are only utils
            setTargetIpAddress: setTargetIpAddress,
            getHashCode: getHashCode,
            setTargetAuthToken: setTargetAuthToken,

            // Followings are QRC API
            reboot: reboot,
            getScreenshot: getScreenshot,

            getPublicInfo: getPublicInfo,
            getToken: getToken,
            getInfo: getInfo,

            listSettings: listSettings,
            setSettings: setSettings,
            getSettings: getSettings,

            getWifiScanResults: getWifiScanResults,
            getWifiState: getWifiState,
            setWifiState: setWifiState,
            setNetWifiState: setNetWifiState,
            getWifiNetwork: getWifiNetwork,
            setWifiNetwork: setWifiNetwork,
            setNetWifiNetwork: setNetWifiNetwork,

            getProxy: getProxy,
            setProxy: setProxy,

            getPlaylistlogState: getPlaylistlogState,
            setPlaylistlogState: setPlaylistlogState,

            setProp: setProp,
            listProp: listProp,

            setSecurityPassword: setSecurityPassword,
            deleteSecurityPassword: deleteSecurityPassword,

            listAudioVolume: listAudioVolume,
            setAudioVolume: setAudioVolume,

            listLed: listLed,
            getLed: getLed,
            setLed: setLed,

            setPresenceEnableState: setPresenceEnableState,
            getPresenceStatus: getPresenceStatus,
            setPresenceStatus: setPresenceStatus,
            getPresenceGearing: getPresenceGearing,
            setPresenceGearing: setPresenceGearing,

            getEth0State: getEth0State,
            setEth0State: setEth0State,
            getEth0Network: getEth0Network,
            setEth0Network: setEth0Network,
            setBeaconSettings: setBeaconSettings,
            getiBeaconSettings: getiBeaconSettings,
            getEddystoneUidSettings: getEddystoneUidSettings,
            getEddystoneUrlSettings: getEddystoneUrlSettings,
            getNfcState: getNfcState,
            setNfcState: setNfcState,
            getEmergencyMessage: getEmergencyMessage,
            getBroadcastMessage: getBroadcastMessage,
            setTextMessageNone: setTextMessageNone,
            setEmergenMessage: setEmergenMessage,
            setBroadcastMessage: setBroadcastMessage,
            setAppUninstall: setAppUninstall,
            setAppStart: setAppStart,
            setAppStop, setAppStop,
            getAppList, getAppList,
            getAppInfo, getAppInfo,
            buildUrl: buildUrl,
            postConfig: postConfig,
            rebootDevice: rebootDevice,
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
        function setTargetIpAddress(ip_address, idx) {
            if (!idx) idx = 0;
            ipAddress[idx] = ip_address + ":8080";
        }

        function setTargetAuthToken(token, idx) {
            if (!idx) idx = 0;
            authToken[idx] = token;
            //QRCTokenInjector.setToken(token);
        }


        // Followings are QRC API
        function reboot(idx) {
            var url = buildUrl("/v1/task/reboot", idx);
            return $http.post(url, {}, getConfig(idx));
        }
        function getScreenshot(idx) {
            var url = buildUrl("/v1/task/screenshot", idx);
            return $http.get(url, getConfig(idx));
        }

        function getPublicInfo(key, idx) {
            var url = buildUrl("/v1/public/info?key=" + key, idx);
            return $http.get(url, getConfig(idx, true));
        }
        function getToken(password_input, idx) {
            var url = buildUrl("/v1/oauth2/token", idx);
            return $http.post(url, {
                grant_type: "password",
                username: "admin",
                password: password_input},
                              getConfig(idx, true));
        }
        function getInfo(idx) {
            var url = buildUrl("/v1/info", idx);
            return $http.get(url, getConfig(idx));
        }

        function listSettings(idx) {
            var url = buildUrl("/v1/settings", idx);
            return $http.get(url, getConfig(idx));
        }
        function setSettings(key, value, idx) {
            var url = buildUrl("/v1/settings/" + key, idx);
            console.log(key+': '+value);
            return $http.post(url, {
                "value": value}, getConfig(idx));
        }

        function postConfig(url, param, idx) {
            console.log("url:" + url + " param:" + JSON.stringify(param));
            return $http.post(url, param, getConfig(idx));
        }

        function getSettings(key, idx) {
            var url = buildUrl("/v1/settings/" + key, idx);
            return $http.get(url, getConfig(idx));
        }

        function getWifiScanResults(idx) {
            var url = buildUrl("/v1/wifi/scan_results", idx);
            return $http.get(url, getConfig(idx));
        }

        function setWifiState(state, idx) {
            var stateStr = (state != 0)? "enabled" : "disabled";
            var url = buildUrl("/v1/wifi/state", idx);
            return $http.post(url, {
                "value": stateStr}, getConfig(idx));
        }
        
        function setNetWifiState(state, idx) {
            var stateStr = (state != 0)? "enabled" : "disabled";
            var url = buildUrl("/v1/net/wifi/state", idx);
            return $http.post(url, {
                "value": stateStr}, getConfig(idx));
        }
        
        function getWifiState(idx) {
            var url = buildUrl("/v1/wifi/state", idx);
            return $http.get(url, getConfig(idx));
        }
        
        function getWifiNetwork(idx) {
            var url = buildUrl("/v1/wifi/network", idx);
            return $http.get(url, getConfig(idx));
        }
        function setWifiNetwork(wifiConfig, idx) {
            var url = buildUrl("/v1/wifi/network", idx);
            return $http.post(url, wifiConfig, getConfig(idx));
        }
        function setNetWifiNetwork(wifiConfig, idx) {
            var url = buildUrl("/v1/net/wifi/network", idx);
            return $http.post(url, wifiConfig, getConfig(idx));
        }

        // proxy
        function getProxy(idx) {
            var url = buildUrl("/v1/net/proxy", idx);
            return $http.get(url, getConfig(idx));
        }
        function setProxy(param, idx) {
            var url = buildUrl("/v1/net/proxy", idx);
            return $http.post(url, param, getConfig(idx));
        }

        function getPlaylistlogState(idx) {
            var url = buildUrl("/v1/player/playlistlog/state", idx);
            return $http.get(url, getConfig(idx));
        }
        function setPlaylistlogState(param, idx) {
            var url = buildUrl("/v1/player/playlistlog/state", idx);
            return $http.post(url, param, getConfig(idx));
        }

        function setProp(prop, value, idx) {
            var url = buildUrl("/v1/prop/" + prop, idx);
            return $http.post(url, {
                "value": value}, getConfig(idx));
        }
        function listProp(idx) {
            var url = buildUrl("/v1/prop", idx);
            return $http.get(url, getConfig(idx));
        }

        function setSecurityPassword(value, idx) {
            var url = buildUrl("/v1/user/password", idx);
            return $http.post(url, {
                "value": value}, getConfig(idx));
        }
        
        function deleteSecurityPassword(idx) {
            var url = buildUrl("/v1/user/password", idx);
            return $http.delete(url, getConfig(idx));
        }

        function listAudioVolume(idx) {
            var url = buildUrl("/v1/audio/volume", idx);
            return $http.get(url, getConfig(idx));
        }

        function setAudioVolume(streamType, value, idx) {
            var url = buildUrl("/v1/audio/volume/" + streamType, idx);
            return $http.post(url, {
                "value": value}, getConfig(idx));
        }

        function listLed(idx) {
            var url = buildUrl("/v1/led", idx);
            return $http.get(url, getConfig(idx));
        }

        function  getLed(key, idx) {
            var url = buildUrl("/v1/led/" + key, idx);
            return $http.get(url, getConfig(idx));
        }

        function  setLed(key, r, g, b, idx) {
            var url = buildUrl("/v1/led/" + key, idx);
            return $http.post(url, {
                "red": r, "green": g, "blue": b}, getConfig(idx));
        }
        
        function setPresenceEnableState(enableState, idx) {
            var url = buildUrl("/v1/presence/enabled", idx);
            var obj = {value: enableState};
            return $http.post(url, obj, getConfig(idx, false, 60000));            
        }

        function getPresenceStatus(type, index, idx) {
            var url = buildUrl("/v1/presence/status/" + index + "/" + type, idx);
            return $http.get(url, getConfig(idx, false, 60000));
        }

        function setPresenceStatus(type, value, index, idx) {
            var url = buildUrl("/v1/presence/status/" + index, idx);
            var obj = {};
            obj[type] = value;
            return $http.post(url, obj, getConfig(idx, false, 60000));
        }

        function getPresenceGearing(type, index, idx) {
            var url = buildUrl("/v1/presence/status/" + index + "/" + type, idx);
            return $http.get(url, getConfig(idx, false, 60000));
        }

        function setPresenceGearing(type, value, index, idx) {
            var url = buildUrl("/v1/presence/status/" + index, idx);
            var obj = {};
            obj[type] = value;
            return $http.post(url, obj, getConfig(idx, false, 60000));
        }

        function getEth0State(idx) {
            var url = buildUrl("/v1/eth/0/state", idx);
            return $http.get(url, getConfig(idx));
        }
        function setEth0State(state, idx) {
            var stateStr = (state != 0)? "enabled" : "disabled";
            var url = buildUrl("/v1/eth/0/state", idx);
            return $http.post(url, {
                "value": stateStr}, getConfig(idx));
        }
        function getEth0Network(idx) {
            var url = buildUrl("/v1/eth/0/network", idx);
            return $http.get(url, getConfig(idx));
        }
        function setEth0Network(ethConfig, idx) {
            var url = buildUrl("/v1/eth/0/network", idx);
            return $http.post(url, ethConfig, getConfig(idx));
        }
        function setBeaconSettings(beaconSettings, idx) {
            var url;
            console.log(beaconSettings);
            var obj = {};
            if (beaconSettings.action == "enable") {
                obj.state = "enabled";
            } else {
                obj.state = "disabled";
            }
            if(beaconSettings.type == "ibeacon") {
                url = buildUrl("/v1/net/beacon/ibeacon", idx);
                if(beaconSettings.uuid) {
                    obj.uuid = beaconSettings.uuid;
                }
                if(beaconSettings.major) {
                    obj.major = beaconSettings.major;
                }
                if(beaconSettings.minor) {
                    obj.minor = beaconSettings.minor;
                }
                if (beaconSettings.ibeacon_mode) {
                    obj.advertise_mode = beaconSettings.ibeacon_mode;
                }
                if (beaconSettings.ibeacon_power) {
                    obj.power = beaconSettings.ibeacon_power;
                }
            } else if (beaconSettings.type == "eddystone_uid") {
                url = buildUrl("/v1/net/beacon/eddystone_uid", idx);
                if(beaconSettings.namespace) {
                    obj.namespace = beaconSettings.namespace;
                }
                if(beaconSettings.instance) {
                    obj.instance = beaconSettings.instance;
                }
                if (beaconSettings.uid_mode) {
                    obj.advertise_mode = beaconSettings.uid_mode;
                }
                if (beaconSettings.uid_power) {
                    obj.power = beaconSettings.uid_power;
                }
            } else {
                url = buildUrl("/v1/net/beacon/eddystone_url", idx);
                if(beaconSettings.url) {
                    obj.url = beaconSettings.url;
                }
                if (beaconSettings.url_mode) {
                    obj.advertise_mode = beaconSettings.url_mode;
                }
                if (beaconSettings.url_power) {
                    obj.power = beaconSettings.url_power;
                }
            }
            console.log(obj);
            return $http.post(url, obj, getConfig(idx));
        }
        function getiBeaconSettings(idx) {
            var url = buildUrl("/v1/net/beacon/ibeacon", idx);
            return $http.get(url, getConfig(idx));
        }
        function getEddystoneUidSettings(idx) {
            var url = buildUrl("/v1/net/beacon/eddystone_uid", idx);
            return $http.get(url, getConfig(idx));
        }
        function getEddystoneUrlSettings(idx) {
            var url = buildUrl("/v1/net/beacon/eddystone_url", idx);
            return $http.get(url, getConfig(idx));
        }
        function getNfcState(idx) {
            var url = buildUrl("/v1/settings/nfc_enabled", idx);
            return $http.get(url, getConfig(idx));
        }
        function setNfcState(state, idx) {
            var url = buildUrl("/v1/settings/nfc_enabled", idx);
            var obj = {value: state};
            return $http.post(url, obj, getConfig(idx));
        }
        function getEmergencyMessage(idx) {
            var url = buildUrl("/v1/textmsg/1000", idx);
            return $http.get(url, getConfig(idx));
        }
        
        function getBroadcastMessage(idx) {
            var url = buildUrl("/v1/textmsg/3000", idx);
            return $http.get(url, getConfig(idx));
        }
        
        function setTextMessageNone(idx) {
            var url = buildUrl("/v1/textmsg", idx);
            return $http.delete(url, getConfig(idx));
        }
        
        function setEmergenMessage(textMessage, idx) {
            var url = buildUrl("/v1/textmsg/1000", idx);
            var obj = {};
            var currentTime = new Date((new Date().getTime()) - 60000);
            obj.id = currentTime.getTime();
            obj.data = {};
            obj.data.priority = 1000;
            obj.data.starttime = currentTime.toISOString();
            console.log(obj.data.starttime);
            obj.data.dur = 83400;
            obj.data.msg = textMessage.emergency_message;
            if(textMessage.emergency_title) {
                obj.data.options = {};
                obj.data.options.title = textMessage.emergency_title;
            }
            return $http.post(url, obj, getConfig(idx));
        }
        
        function setBroadcastMessage(textMessage, idx) {
            var url = buildUrl("/v1/textmsg/3000", idx);
            var obj = {}
            var currentTime = new Date();
            obj.id = currentTime.getTime();
            obj.data = {};
            obj.data.priority = 3000;

            if(textMessage.startTime == "custom") {
                console.log(textMessage.broadcast_customTime);
                //var localtime = new Date(textMessage.broadcast_customTime.replace(/-/g,'/').replace('T',' '));
                var localtime = new Date(textMessage.broadcast_customTime);
                console.log("start time:" + localtime.toISOString());
                obj.data.starttime = localtime.toISOString();
            } else {
                obj.data.starttime = (new Date()).toISOString();
            }
            obj.data.dur = textMessage.broadcast_duration;
            obj.data.msg = textMessage.broadcast_message;
            obj.data.options = {};
            obj.data.options.type = "normal";
            obj.data.options.position = "bottom";
            obj.data.options.fontSize = textMessage.broadcast_font;
            if(textMessage.fontColor) {
                obj.data.options.fontColor = textMessage.fontColor;
            } else {
                obj.data.options.fontColor = "#000000";
            }

            if(textMessage.backgroundColorType == "broadcastBackgroundColor") {
                if(textMessage.backgroundColor) {
                    obj.data.options.bgColor = textMessage.backgroundColor;
                } else {
                    obj.data.options.bgColor = "#000000";
                }
            }
            obj.data.options.direction = textMessage.direction;
            return $http.post(url, obj, getConfig(idx));
        }
        
        function setAppUninstall(appUninstall, idx) {
            var url = buildUrl("/v1/task/uninstall_app", idx);
            var obj = {};
            obj.pkgname = appUninstall.package;
            return $http.post(url, obj, getConfig(idx));
        }
        
        function setAppStart(appStart, idx) {
            var url = buildUrl("/v1/task/start_app", idx);
            var obj = {};
            obj.pkgname = appStart.package;
            obj.classname = appStart.class;
            return $http.post(url, obj, getConfig(idx));
        }
        
        function setAppStop(appStop, idx) {
            var url =buildUrl("/v1/task/stop_app", idx);
            var obj = {};
            if(/[^0-9]/.test(appStop.package)) {
                obj.pkgname = appStop.package;
            } else {
                obj.pid = appStop.package;
            }
            return $http.post(url, obj, getConfig(idx));
        }
        
        function getAppList(idx) {
            var url = buildUrl("/v1/appinfo", idx);
            return $http.get(url, getConfig(idx));
        }
        
        function getAppInfo(pkgname, idx) {
            var url = buildUrl("/v1/appinfo/" + pkgname, idx);
            return $http.get(url, getConfig(idx));
        }
        
        function rebootDevice(reasonStr, idx) {
            var url = buildUrl("/v1/reboot", idx);
            return $http.post(url, {"reason": reasonStr}, getConfig(idx));
        }

        function buildUrl(path, idx) {
            var url = "";
            if (!idx) idx = 0;
            if (ipAddress[idx] != null) {
                url = "http://" + ipAddress[idx] + path;
            } else {
                console.error("Target ipAddress is null.");
            }
            return url;
        }

        // ------------------------------- Internal functions

        function getConfig(idx, noAuth, timeout) {
            var config = {};
            if (!idx) idx = 0;
            if (!noAuth) {
                config.headers = {'Authorization': "Bearer " + authToken[idx]};
            }
            config.timeout = timeout? timeout:defaultTimeout;
            return config;
        }
    }
    /*
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
    */
})();
