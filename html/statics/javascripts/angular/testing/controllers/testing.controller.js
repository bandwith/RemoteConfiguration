(function () {
    'use strict';

    angular
        .module('qrc-center.testing.controllers')
        .controller('TestingController', TestingController);

    TestingController.$inject = ['QRC', 'QRCTesting', '$scope', '$injector', '$timeout', 'TestingData', 'TestingUtils'];

    function TestingController(QRC, QRCTesting, $scope, $injector, $timeout, TestingData, TestingUtils) {
        var TestCases = {
            TestGetToken: TestGetToken,
            TestGetInfo: TestGetInfo,

            TestSetSettingsNTP: TestSetSettingsNTP,
            TestSetSettingsRebootTime: TestSetSettingsRebootTime,
            TestSetSettingsIsRebootOptimized: TestSetSettingsIsRebootOptimized,
            TestSetSettingsIsLcdOn: TestSetSettingsIsLcdOn,
            TestGetSettings: TestGetSettings,

            TestGetWifiScanResults: TestGetWifiScanResults,
            TestSetWifiState: TestSetWifiState,

            TestSetProp: TestSetProp,
            testlistProp: testlistProp,

            TestSetSecurityPassword: TestSetSecurityPassword,

            TestAudioVolume: TestAudioVolume,

            TestLed: TestLed,

            TestUnSupportPath: TestUnSupportPath,

            EndTest: EndTest,
        };
        var vm = this;


        var testingModelData = null;
        var isTestBreak = false;        
        var wifiScanRetried = false;
        var isSingleTest = false;
        var cacheTestingData = null;
        var FnName = null;

        activate();

        function activate() {
            vm.test_ip = "";
            vm.test_password = "12345678";
            vm.model_id = "common";
            if (sessionStorage && sessionStorage.cacheTestingData) {
                try {
                    cacheTestingData = angular.fromJson(sessionStorage.cacheTestingData);
                    vm.test_ip = cacheTestingData.test_ip;
                    vm.test_password = cacheTestingData.test_password;
                    vm.model_id = cacheTestingData.model_id;
                } catch (err) {
                    console.warn("unable to read sessionStorage, clear cacehData.");
                    sessionStorage.removeItem('cacheTestingData');
                }
            }
            vm.testCasesArray = null;
            vm.testMethod = 0;
            vm.modelChange = modelChange;
            vm.testAll = testAll;
            vm.testSingle = testSingle;
            vm.testCase = null;

            vm.isTesting = false;
            vm.testCases = TestCases;
            var model_array = [];
            for (var modelId in TestingData) {
                model_array.push(modelId);
            }
            vm.models = model_array;
            modelChange();

        }
        function tryTestNext(caseReadyArray, caseNumber, testFn) {
            if (isTestBreak) return;
            if (!caseReadyArray[caseNumber+1]) {
                caseReadyArray[caseNumber+1] = {ready: false};
            }
            if (caseReadyArray[caseNumber].ready) {
                testFn(caseReadyArray[caseNumber+1]);
                return;
            }
            $timeout(function(){
                tryTestNext(caseReadyArray, caseNumber, testFn);
            }, 100);
            /*
            setTimeout(function(){
                tryTestNext(caseReadyArray, caseNumber, testFn);
            }, 100);*/
        }

        function testSingle() {
            isSingleTest = true;
            setupEnv();
            if (vm.testMethod == 0) {
                // test by testCases
                var testFn = TestCases[vm.testCase];
                testFn();
            } else if (vm.testMethod == 1) {

            } else {
                console.error("Un-recognized testMethod:" + vm.testMethod);
            }

        }

        function testAll() {
            isSingleTest = false;
            setupEnv();

            var testFn;
            var caseReadyArray = [{ready:true}];
            var i = 0;
            for (testFn in TestCases) {
                if (TestCases.hasOwnProperty(testFn)) {
                    tryTestNext(caseReadyArray, i, TestCases[testFn]);
                }
                if (isTestBreak) {
                    break;
                }
                i++;
            }
        }

        // Authentication
        function TestGetToken(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.getToken(vm.test_password).then(successFn, commonErrorFn);
            function successFn(data) {
                printAndAppendResult(FnName + ": PASS", data);
                QRC.setTargetAuthToken(data.data.access_token);
                QRCTesting.setTargetAuthToken(data.data.access_token);
                nextTestReady(nextCaseReadiness);
            }
        }

        // Get Device Info
        function TestGetInfo(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.getInfo().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    if (verifyTestResult(data)) {
                        printAndAppendResult(FnName +": PASS", data);
                    }
                } catch(err) {
                    printErrorAndBreak("Error to response of TestGetInfo()", data, err);
                }
                nextTestReady(nextCaseReadiness);
            }
            function verifyTestResult(data) {
                var results = data.data.results;
                for (var key in testingModelData.info) {
                    TestingUtils.checkResults(results[key],
                                              testingModelData.info[key],
                                              key)
                }
                return true;
            }
        }

        // Settings
        function TestSetSettingsNTP(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            testSetSettingsByKey(FnName, nextCaseReadiness, "ntp_server", "2.uk.pool.ntp.org");
        }
        function TestSetSettingsRebootTime(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            testSetSettingsByKey(FnName, nextCaseReadiness, "reboot_time", "17:30");
        }
        function TestSetSettingsIsRebootOptimized(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            testSetSettingsByKey(FnName, nextCaseReadiness, "is_reboot_optimized", false);
        }
        function TestSetSettingsIsLcdOn(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            if (checkSkipTest(testingModelData.settings, "is_lcd_on")) {
                printAndAppendResult(FnName + ": SKIP");
                nextTestReady(nextCaseReadiness);
                return;
            }
            printAndAppendResult("Start testing " + FnName + "...");
            testSetSettingsByKey(FnName, nextCaseReadiness, "is_lcd_on", false);
        }
        function testSetSettingsByKey(fnName, nextCaseReadiness, key, value) {
            QRC.setSettings(key, value).then(successFn, commonErrorFn);
            function successFn(data) {
                QRC.getSettings(key).then(successFn, errorFn);
                function successFn(data) {
                    try {       
                        if (data.data.value == value) {
                            QRC.setSettings(key, testingModelData.settings[key][2]).then(function() {
                                printAndAppendResult(fnName + " " + key + ": PASS", data);
                                nextTestReady(nextCaseReadiness);
                            }, errorFn);
                        } else {
                            printErrorAndBreak("setSettings() doesn't take effect, key:" +
                                               key + ", value:" + value, data);
                        }
                    } catch(err) {
                        printErrorAndBreak("Error of "+ FnName, null, err);
                    }
                }
                function errorFn(data) {
                    printErrorAndBreak("Error of " + "getSettingsByKey" + ", value:" + value, data);
                }
            }
            function errorFn(data) {
                printErrorAndBreak("Error of " + fnName + ", value:" + value, data);
            }
        }

        function TestGetSettings(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.listSettings().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    if (verifyTestResult(data)) {
                        printAndAppendResult(FnName +": PASS", data);
                    }
                } catch(err) {
                    printErrorAndBreak("Error to verify results of " + FnName , data, err);
                }
                nextTestReady(nextCaseReadiness);
            }
            function verifyTestResult(data) {
                var results = data.data.results;
                for (var key in testingModelData.settings) {
                    TestingUtils.checkResults(results[key],
                                              testingModelData.settings[key],
                                              key)
                }
                return true;
            }
        }

        function checkSkipTest(data, key) {
            if (data[key] == null) {
                return true;
            }
            return false;
        }

        function TestSetWifiState(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.setWifState(0).then(successFn, commonErrorFn);
            function successFn(data) {
                QRC.getWifiScanResults().then(successFn, commonErrorFn);
                function successFn(data) {
                    try {
                        if (data.data.results.length != 0 && !wifiScanRetried) {
                            wifiScanRetried = true;
                            // Wifi may just be enabled, give it a 2nd chance to get results.
                            $timeout(function(){
                                TestSetWifiState(nextCaseReadiness);
                            }, 15000);
                            printAndAppendResult("Wait 15 sec then retry " + FnName + "...");
                            return;
                        }
                        if (data.data.results.length == 0) {
                            QRC.setWifState(1).then(function() {
                                wifiScanRetried = false;
                                printAndAppendResult(FnName + ": PASS", data);

                                nextTestReady(nextCaseReadiness);
                            }, errorFn);
                        } else {
                            printErrorAndBreak("Wifi is disabled but still get scan results.", data);
                        }
                    } catch(err) {
                        printErrorAndBreak("Error of "+ FnName, null, err);
                    }
                }
                function errorFn(data) {
                    printErrorAndBreak("Error of getWifiScanResults", data);
                }
            }
        }
        function TestGetWifiScanResults(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.setWifState(1); // Make sure we enable wifi
            QRC.getWifiScanResults().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    if (data.data.results.length == 0 && !wifiScanRetried) {
                        wifiScanRetried = true;
                        // Wifi may just be enabled, give it a 2nd chance to get results.
                        $timeout(function(){
                            TestSetWifiState(nextCaseReadiness);
                        }, 15000);
                        printAndAppendResult("Wait 15 sec then retry " + FnName + "...");
                        return;
                    }
                    wifiScanRetried = false;
                    var ap0 = data.data.results[0];
                    if (!ap0.BSSID) {
                        printErrorAndBreak("Unable to get BSSID");    
                    }
                    if (!ap0.SSID) {
                        printErrorAndBreak("Unable to get SSID");    
                    }

                    if (!ap0.capabilities) {
                        printErrorAndBreak("Unable to get capabilities");    
                    }
                    if (!ap0.frequency) {
                        printErrorAndBreak("Unable to get frequency");    
                    }
                    if (!ap0.level) {
                        printErrorAndBreak("Unable to get level");    
                    }
                    if (!ap0.timestamp) {
                        printErrorAndBreak("Unable to get timestamp");    
                    }
                    printAndAppendResult(FnName + ": PASS", data);
                    nextTestReady(nextCaseReadiness);
                } catch(err) {
                    printErrorAndBreak("Error of " + FnName, null, err);
                }
            }

        }

        function TestSetProp(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.setProp("persist.sys.timezone", "Asia/Taipei").then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    printAndAppendResult(FnName + ": PASS", data);
                    nextTestReady(nextCaseReadiness);
                } catch(err) {
                    printErrorAndBreak("Error of " + FnName, null, err);
                }
            }
        }

        function testlistProp(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.listProp().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    if (verifyTestResult(data)) {
                        printAndAppendResult(FnName +": PASS", data);
                    }
                } catch(err) {
                    printErrorAndBreak("Error to verify results of " + FnName , data, err);
                }
                nextTestReady(nextCaseReadiness);
            }
            function verifyTestResult(data) {
                var results = data.data.results;
                for (var key in testingModelData.prop) {
                    TestingUtils.checkResults(results[key],
                                              testingModelData.prop[key],
                                              key)
                }
                return true;
            }
        }

        function TestSetSecurityPassword(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            printAndAppendResult("Start testing " + FnName + "...");
            var password = "abcde";
            QRC.setSecurityPassword(password).then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    QRC.getToken(password).then(successFn1, commonErrorFn);
                    function successFn1(data) {
                        QRC.setTargetAuthToken(data.data.access_token);
                        QRCTesting.setTargetAuthToken(data.data.access_token);
                        // Restore original password back.
                        QRC.setSecurityPassword(vm.test_password).then(successFn2, commonErrorFn);
                        function successFn2(data) {
                            printAndAppendResult(FnName + ": PASS", data);
                            nextTestReady(nextCaseReadiness);
                        }
                    }
                } catch(err) {
                    printErrorAndBreak("Error of " + FnName, null, err);
                }
            }
        }

        function TestAudioVolume(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            var streamType = "stream_music";
            var volumeValue = 0;
            printAndAppendResult("Start testing " + FnName + "...");
            QRC.listAudioVolume().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    var results = data.data.results;
                    var origValue = results[streamType];
                    if (origValue == volumeValue) {
                        volumeValue = 100;
                    }
                    QRC.setAudioVolume(streamType, volumeValue).then(successFn1, commonErrorFn);
                    function successFn1(data) {
                        QRC.listAudioVolume().then(successFn2, commonErrorFn);
                        function successFn2(data) {
                            if (data.data.results[streamType]== volumeValue) {
                                printAndAppendResult(FnName + ": PASS", data);
                                nextTestReady(nextCaseReadiness);
                            }
                        }
                    }
                } catch(err) {
                    printErrorAndBreak("Error of " + FnName, null, err);
                }
            }
        }

        function TestLed(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            QRC.listLed().then(successFn, commonErrorFn);
            function successFn(data) {
                try {
                    var results = data.data.results;
                    var key;
                    var keyArray = [];
                    for (key in testingModelData.led) {
                        keyArray.push(key);
                        if (results.hasOwnProperty(key)) {
                            printErrorAndBreak("Error of " + FnName + ", result doesn't contain " +
                                               testingModelData.led[key],
                                               null);
                        }
                    }
                    if (!key) {
                        // if device doesn't have led, break;
                        nextTestReady(nextCaseReadiness);
                        return; 
                    }
                    testLedLoop(nextCaseReadiness, keyArray, 0);
                } catch(err) {
                    printErrorAndBreak("Error of " + FnName, null, err);
                }                
            }
        }
        function testLedLoop(nextCaseReadiness, keyArray, idx) {
            var key = keyArray[idx];
            var ledType = testingModelData.led[key];
            QRC.setLed(key, ledType.red, ledType.green, ledType.blue).then(successFn1, commonErrorFn);
            function successFn1(data) {
                QRC.getLed(key).then(successFn2, commonErrorFn);
                function successFn2(data) {
                    if (data.data.red == ledType.red &&
                        data.data.green == ledType.green &&
                        data.data.blue == ledType.blue) {
                        printAndAppendResult(FnName + " " + key + ": PASS", data);
                        idx++;
                        if (idx < keyArray.length) {
                            testLedLoop(nextCaseReadiness, keyArray, idx);
                        } else {
                            nextTestReady(nextCaseReadiness);
                        }
                    } else {
                        printErrorAndBreak("Error of " + FnName + ", RGB doesn't as expect " +
                                           "\nExpected: " + ledType.red + "," + ledType.green + "," + ledType.blue +
                                           "\nBut got : " + data.data.red + "," + data.data.green + "," + data.data.blue,
                                           null);
                    }
                }
            }

        }

        // Corner Test
        function TestUnSupportPath(nextCaseReadiness) {
            FnName = TestingUtils.getFnName();
            QRCTesting.getV1Path("/badpath").then(commonSuccessFn, errorFn);
            function errorFn(data) {
                if (data.status == 404) {
                    printAndAppendResult(FnName + ": PASS", data);
                    nextTestReady(nextCaseReadiness);
                } else {
                    printErrorAndBreak("Error to test, should return HTTP 401" + FnName, data);
                }
            }
        }

        // More test case here...


        // End of Test
        function EndTest() {
            vm.isTesting = false;
            printAndAppendResult("\nGood. End Test.");
        }

        function breakTest() {
            vm.isTesting = false;
            isTestBreak = true;
        }
        function commonSuccessFn(data) {
            printErrorAndBreak("Success to test " + FnName, data);
        }
        function commonErrorFn(data) {
            printErrorAndBreak("Error to test " + FnName, data);
        }

        function setupEnv() {
            cacheTestingData = {};
            cacheTestingData.test_ip = vm.test_ip;
            cacheTestingData.test_password = vm.test_password;
            cacheTestingData.model_id = vm.model_id;

            sessionStorage.cacheTestingData = angular.toJson(cacheTestingData);

            vm.isTesting = true;
            clearResult();
            QRC.setTargetIpAddress(vm.test_ip);
            QRCTesting.setTargetIpAddress(vm.test_ip);
            isTestBreak = false;
            wifiScanRetried = false;
        }
        function nextTestReady(nextCaseReadiness) {
            if (isSingleTest) {
                EndTest();
            } else {
                nextCaseReadiness.ready = true;
            }
        }
        function printError(msg, data, error) {
            vm.test_fail_result = vm.test_fail_result + (vm.test_fail_result? "\n": "") + msg;
            if (data && data.data) {
                var jsonObj = data.data
                vm.test_fail_result = vm.test_fail_result + 
                    "\nHTTP " + data.status + " " + data.statusText + "\n" +
                    "Responsed JSON content: " + JSON.stringify(jsonObj);
            }
            if (error) {
                vm.test_fail_result += "\nError:\n"
                vm.test_fail_result += error.message + "\n";
                vm.test_fail_result += error.stack + "\n";
            }

            vm.test_fail_result += "\nPlease check console log for more information.\n"
        }
        function printErrorAndBreak(msg, responseData, error) {
            printError(msg, responseData, error);
            breakTest();
            throw new Error(msg);
        }
        function printAndAppendResult(msg, data) {
            vm.test_result = vm.test_result + (vm.test_result? "\n": "") + msg;
            if (data && isSingleTest) {
                vm.test_result = vm.test_result + "\n" + JSON.stringify(data.data, null, 2);
            }
        }
        function clearResult() {
            vm.test_result = "";
            vm.test_fail_result = "";
        }

        function modelChange() {
            testingModelData = TestingData[vm.model_id];
            vm.testCasesArray = [];
            for (var key in TestCases) {
                vm.testCasesArray.push(key);
            }
            vm.testCase = vm.testCasesArray[0];
        }
    }
})();