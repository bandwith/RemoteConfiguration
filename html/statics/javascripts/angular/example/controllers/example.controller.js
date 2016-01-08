(function () {
    'use strict';

    angular
        .module('qrc-center.example.controllers')
        .controller('ExampleController', ExampleController);

    ExampleController.$inject = ['QRC', '$scope', '$injector'];

    function ExampleController(QRC, $scope, $injector) {
        var newPassword = "abcde";
        var newTimeZone = "Europe/Amsterdam";
        var newAudioVolume = ["stream_system", 0];
        var newContentURL = "http://folk.uio.no/annembek/inf3210/examples/basic.smil";
        var presenceDeviceIndex = 0;

        var ExampleCases = {
            ExampleGetAuth2Token: 
            [ExampleGetAuth2Token, 
             "This example will get an access token if password you set is correct. Almost all APIs need access token to do the request. This example will get an access token then insert this token into http header as an Authentication token for following examle you try. So please always run this example to get access token before running other examples. "],
            ExampleSetSecurityPassword:
            [ExampleSetSecurityPassword,
             "This example will set the target device's security password to '" + newPassword + "'"],
            ExampleDisableWifi: 
            [ExampleDisableWifi,
             "This example will disable wifi"],
            ExampleChangeTimeZone:
            [ExampleChangeTimeZone,
             "This example will set the target device's time zone to '" + newTimeZone + "'"],

            ExampleSetAudioVolume: 
            [ExampleSetAudioVolume,
             "This example will set the audio volume of type '" + newAudioVolume[0] + "' to " + newAudioVolume[1]],
            ExampleSetContentUrl: 
            [ExampleSetContentUrl,
             "This example will set the content URL '" + newContentURL + "' into the SMIL player"],

            ExampleEnablePresence: 
            [ExampleEnablePresence,
             "This example will enable Presence Device function"],
            ExampleDisablePresence: 
            [ExampleDisablePresence,
             "This example will disable Presence Device function"],
            ExampleGetPresencePIR: 
            [ExampleGetPresencePIR,
             "This example will get PIR status (detected/undetected people, or unconnected/unknown) of the Presence Device index " + presenceDeviceIndex],
            ExampleGetPresenceLight: 
            [ExampleGetPresenceLight,
             "This example will get Light status (red/green, or unconnected/unknown) of the Presence Device index " + presenceDeviceIndex],
            ExampleSetPresenceLightToGreen: 
            [ExampleSetPresenceLightToGreen,
             "This example will set Presence Device's light color (index "+ presenceDeviceIndex +") to green"],
            ExampleSetPresenceLightToRed: 
            [ExampleSetPresenceLightToRed,
             "This example will set Presence Device's light color (index "+ presenceDeviceIndex +") to red"],
        };
        var vm = this;

        var isExampleBreak = false;        
        var wifiScanRetried = false;
        var cacheExampleData = null;
        var FnName = null;

        activate();

        function activate() {
            vm.example_ip = "";
            vm.example_password = "12345678";
            vm.model_id = "common";
            if (sessionStorage && sessionStorage.cacheExampleData) {
                try {
                    cacheExampleData = angular.fromJson(sessionStorage.cacheExampleData);
                    vm.example_ip = cacheExampleData.example_ip;
                    vm.example_password = cacheExampleData.example_password;
                    QRC.setTargetAuthToken(cacheExampleData.accessToken);
                } catch (err) {
                    console.warn("unable to read sessionStorage, clear cacehData.");
                    sessionStorage.removeItem('cacheExampleData');
                }
            }
            vm.startExample = startExample;
            vm.exampleCase = null;
            vm.isExampleRunning = false;
            vm.exampleCases = ExampleCases;

            vm.exampleCasesArray = [];
            for (var key in ExampleCases) {
                vm.exampleCasesArray.push(key);
            }
            vm.exampleCase = vm.exampleCasesArray[0];
            vm.exampleCaseDescription = ExampleCases[vm.exampleCase][1];
            vm.onExampleCaseChanged = onExampleCaseChanged;
        }

        function startExample() {
            setupEnv();
            // example by exampleCases
            var exampleFn = ExampleCases[vm.exampleCase][0];
            exampleFn();
        }

        // Authentication
        function ExampleGetAuth2Token() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.getToken(vm.example_password).then(sucFn, errFn);
            function sucFn(data) {
                printAndAppendResult("Response Content:", data);
                QRC.setTargetAuthToken(data.data.access_token);
                cacheExampleData.accessToken = data.data.access_token;
                sessionStorage.cacheExampleData = angular.toJson(cacheExampleData);
                DoneExample();
            }
            function errFn(data) {
                if (data && data.status == -1) {
                    printErrorAndBreak("Cannot get response from the HTTP request. Is target IP alive?");
                } else {
                    printErrorAndBreak("Error of running " + FnName +
                                       "\nMaybe your password was changed to '" +
                                       newPassword + "'?", data);
                }
            }
        }

        function ExampleSetSecurityPassword() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setSecurityPassword(newPassword)
                .then(commonSuccessFn, commonErrorFn);
        }
        function ExampleDisableWifi() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setWifState(0).then(commonSuccessFn, commonErrorFn);
        }
        function ExampleChangeTimeZone() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setProp("persist.sys.timezone", newTimeZone)
                .then(commonSuccessFn, commonErrorFn);
        }
        function ExampleSetAudioVolume() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setAudioVolume(newAudioVolume[0], newAudioVolume[1])
                .then(commonSuccessFn, commonErrorFn);
        }
        function ExampleSetContentUrl() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setSettings("smil_content_url", newContentURL)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleEnablePresence() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setPresenceEnableState(true)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleDisablePresence() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setPresenceEnableState(false)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleGetPresencePIR() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.getPresenceStatus("pir", presenceDeviceIndex)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleGetPresenceLight() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.getPresenceStatus("light", presenceDeviceIndex)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleSetPresenceLightToGreen() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setPresenceStatus("light", "green", presenceDeviceIndex)
                .then(commonSuccessFn, commonErrorFn);
        }

        function ExampleSetPresenceLightToRed() {
            FnName = getFnName();
            printAndAppendResult("Start Example " + FnName + "...");
            QRC.setPresenceStatus("light", "red", presenceDeviceIndex)
                .then(commonSuccessFn, commonErrorFn);
        }

        // End of Example
        function DoneExample() {
            vm.isExampleRunning = false;
            printAndAppendResult("\nGood. Example Done. Check your target devcie if the change take effect.");
            if(!$scope.$$phase) {
                $scope.$apply();
            }
        }

        function breakExample() {
            vm.isExampleRunning = false;
            isExampleBreak = true;
        }

        function commonSuccessFn(data) {
            printAndAppendResult("Response Content:", data);
            DoneExample();
        }
        function commonErrorFn(data) {
            if (data && data.status == -1) {
                printErrorAndBreak("Cannot get response from the HTTP request. Is target IP alive?");
            } else {
                printErrorAndBreak("Error of running " + FnName, data);
            }
        }

        function setupEnv() {
            var tmpToken;
            if (cacheExampleData) {
                var tmpToken = cacheExampleData.accessToken;
            }
            cacheExampleData = {};
            cacheExampleData.example_ip = vm.example_ip;
            cacheExampleData.example_password = vm.example_password;
            cacheExampleData.accessToken = tmpToken;

            sessionStorage.cacheExampleData = angular.toJson(cacheExampleData);

            vm.isExampleRunning = true;
            clearResult();
            QRC.setTargetIpAddress(vm.example_ip);
            isExampleBreak = false;
            wifiScanRetried = false;
        }

        function printError(msg, data, error) {
            vm.example_fail_result = vm.example_fail_result + (vm.example_fail_result? "\n": "") + msg;
            if (data && data.data) {
                var jsonObj = data.data
                vm.example_fail_result = vm.example_fail_result + 
                    "\n\nHTTP " + data.status + " " + data.statusText + "\n" +
                    "Responsed JSON content: " + JSON.stringify(jsonObj);
            }
            if (error) {
                vm.example_fail_result += "\n\nError:\n"
                vm.example_fail_result += error.message + "\n";
                vm.example_fail_result += error.stack + "\n";
            }

            vm.example_fail_result += "\nPlease check console log for more information.\n"
        }
        function printErrorAndBreak(msg, responseData, error) {
            printError(msg, responseData, error);
            breakExample();
            throw new Error(msg);
        }
        function printAndAppendResult(msg, data) {
            vm.example_result = vm.example_result + (vm.example_result? "\n": "") + msg;
            if (data) {
                vm.example_result = vm.example_result + "\n" + JSON.stringify(data.data, null, 2);
            }
        }
        function clearResult() {
            vm.example_result = "";
            vm.example_fail_result = "";
        }

        function onExampleCaseChanged() {
            vm.exampleCaseDescription = ExampleCases[vm.exampleCase][1];
        }

        function getFnName() {
            var callerName;
            try { throw new Error(); }
            catch (e) { 
                var re = /(\w*\.*\w+)@|at (\w*\.*\w+) \(/g, st = e.stack, m;
                re.exec(st), m = re.exec(st);
                callerName = m[1] || m[2];
            }
            return callerName;
        };

    }
})();