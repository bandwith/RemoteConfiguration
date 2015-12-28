(function () {
    'use strict';

    angular
        .module('qrc-center.configuration.controllers')
        .controller('ConfigurationController', ConfigurationController);

    ConfigurationController.$inject = ['QRC', '$scope', '$injector', '$timeout', '$http', '$q', 'blockUI'];

    function ConfigurationController(QRC, $scope, $injector, $timeout, $http, $q, blockUI) {

        var RangeIpIndex = 0;
        var scanRequestsTimer = [];
        var scanRequestCaller = [];
        var cacheConfigurationData = {};
        var isGlobalConfigureBreak = false;
        var configuringNum = 0;
        var configuringDoneNum = 0;

        var configureCases = [
            "GetToken",
            "PlayerName",
            "Timezone",
            "SecurityPassword", // Always put Password at last one config.
            "DoneConfig",
        ];
        var vm = this;


        activate();

        function activate() {
            vm.current_password = "";
            vm.configure = {};

            if (sessionStorage && sessionStorage.cacheConfigurationData) {
                try {
                    cacheConfigurationData = angular.fromJson(sessionStorage.cacheConfigurationData);
                } catch (err) {
                    console.warn("unable to read sessionStorage, clear cacehData.");
                    sessionStorage.removeItem('cacheConfigurationData');
                }
                vm.current_password = cacheConfigurationData.current_password;
                vm.configure = cacheConfigurationData.configure;
            }

            vm.ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            // /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

            // For scan tab
            vm.isScanDisabled = true;
            vm.isScanning = false;
            vm.isRemoveRangeBtnShowing = false;
            vm.isNextShow = false;

            vm.addNewRange = addNewRange;
            vm.removeRange = removeRange;
            vm.startScan = startScan;
            vm.goConfigDev = goConfigDev;
            vm.foundIPs = [];
            vm.scannedDevices = [];
            vm.ipCandidates = [];
            vm.timeCostEstimate = 0;


            // For configuration tab
            vm.deviceSelectSize = 3;
            vm.startConfigure = startConfigure;
            vm.onSTableClick = onSTableClick;
            vm.onSTableAllChecked = onSTableAllChecked;
            vm.clearInput = clearInput;
            vm.setFormScope = setFormScope;
            vm.displayScannedDevices = [];
            vm.selectedScannedDevices = [];
            vm.selectedFinalDevices = [];
            vm.finalDevices = [];
            vm.scannedModelId = [];
            vm.isStartConfigureDisabled = true;
            vm.isConfiguring = 0;
            vm.isConfigClicked = false;

            calSTableHeight();


            if (!getLocalIp(onGetIp)){
                onGetIp(null);
            }

            watchScannedDevices();
        }


        // ---------- For Scan Tab ---------- 

        function startScan() {
            if (vm.isScanning) {
                stopScan();
                return;
            }
            initScan();

            var scannedIPs = Object.create(null);
            var requestNum = 0;
            var responseNum = 0;
            var timeCost = 0;
            var NUM_IN_ROUND = 50;
            var DELAY_PER_ROUND_MS = 2500;
            var SCAN_TIMEOUT = 30000;
            var j = 0;

            //var round = 0;

            // First, count how manu request we need and check if all ip range's format are valid.
            for (var i=0; i < vm.ipCandidates.length; i++) {
                var range_start = vm.ipCandidates[i].range_start;
                var range_end = vm.ipCandidates[i].range_end;
                if (!ValidateIPaddress(range_start)) {
                    printScanError("Start IP '"+ range_start +"' is invalid.");
                    stopScan();
                    return;
                }
                if (!ValidateIPaddress(range_end)) {
                    printScanError("End IP '"+ range_end +"' is invalid.");
                    stopScan();
                    return
                };
                if (!isIpRangeValid(range_start, range_end)) {
                    printScanError("Invalid IP range:" +
                                   range_start + "~" + range_end +
                                   "\nShould be within a C Class IP (ex, 192.168.0.1 ~ 192.168.0.254)");
                    stopScan();
                    return;
                }
                var ip_start = parseInt(range_start.match(/\.[\d]+$/)[0].replace(/\./,''));
                var ip_end = parseInt(range_end.match(/\.[\d]+$/)[0].replace(/\./,''));
                if (ip_end < ip_start) {
                    printScanError("Start IP '" + range_start +
                                   "' should be smaller than End IP '"+ range_end +"'");
                    stopScan();
                    return;
                }
                for (var ip = ip_start; ip <= ip_end; ip++) {
                    var targetIP = ip_prefix + ip;
                    if (targetIP in scannedIPs) continue;
                    requestNum++;
                    j++;
                    if ((j % NUM_IN_ROUND) == 0) {
                        timeCost += DELAY_PER_ROUND_MS;
                    }
                }

            }
            vm.timeCostEstimate = (timeCost + SCAN_TIMEOUT)/1000;
            // Then, do the real scan
            scannedIPs = Object.create(null);
            var key = 'abcde';
            var myHashCode = QRC.getHashCode(key);
            timeCost = 0;

            //Testing devices
            /*
            var ip_start = parseInt(range_start.match(/\.[\d]+$/)[0].replace(/\./,''));
            for (var k=0;k<5;k++) {
                appendScannedDevice({data:{results:{model_id:'FHD123',player_name:'ABCDE', serial_number:'210FDVB8'}}}, '192.168.2.'+k);
            }*/


            j = 0;
            for (var i=0; i < vm.ipCandidates.length; i++) {
                if (!vm.isScanning) break;

                var range_start = vm.ipCandidates[i].range_start;
                var range_end = vm.ipCandidates[i].range_end;

                var ip_prefix = range_start.replace(/\.[\d]+$/, '.');
                var ip_start = parseInt(range_start.match(/\.[\d]+$/)[0].replace(/\./,''));
                var ip_end = parseInt(range_end.match(/\.[\d]+$/)[0].replace(/\./,''));

                for (var ip = ip_start; ip <= ip_end; ip++) {
                    if (!vm.isScanning) break;

                    var targetIP = ip_prefix + ip;
                    if (targetIP in scannedIPs) continue;
                    scannedIPs[targetIP] = true;
                    var req = $timeout(function(scanIp) {
                        var caller = $q.defer();

                        $http.get("http://" + scanIp + ":8080/v1/public/info?key=" + key,
                                  {timeout: caller.promise}).then(successScanFn, errorScanFn);
                        $timeout(function(caller) {caller.resolve()}, SCAN_TIMEOUT, true, caller);
                        scanRequestCaller.push(caller);
                        /*
                        QRC.setTargetIpAddress(targetIP);
                        QRC.getPublicInfo(key).then(successScanFn, errorScanFn);
                        */

                    }, timeCost, true, targetIP);
                    scanRequestsTimer.push(req);
                    j++;
                    if ((j % NUM_IN_ROUND) == 0) {
                        timeCost += DELAY_PER_ROUND_MS;
                    }
                }

                function successScanFn(data) {
                    if (data && data.data && data.data.results &&
                        data.data.results.hash_code == myHashCode) {
                        var parser = document.createElement('a');
                        parser.href = data.config.url;

                        appendScannedDevice(data, parser.hostname);
                        printAndAppendScanResult("Found Target IP: " + parser.hostname + ", keep scanning..");

                    }
                    responseNum++;
                    //console.log("responseNum:" + responseNum);
                    checkScanIsDone();

                }
                function errorScanFn(data) {
                    var parser = document.createElement('a');
                    parser.href = data.config.url;
                    if (parser.hostname == "192.168.1.25") {
                        console.log("error response from targetIP:" + targetIP);
                    }
                    responseNum++;
                    //console.log("responseNum:" + responseNum);
                    checkScanIsDone();
                }
                function checkScanIsDone() {
                    if (responseNum == requestNum) {
                        printAndAppendScanResult("Done scan devices. All found devices:" + vm.foundIPs.join(","));
                        stopScan();
                    }
                }
            }
        }
        function stopScan() {
            for (var r in scanRequestsTimer) {
                $timeout.cancel(scanRequestsTimer[r]);
            }
            for (var r in scanRequestCaller) {
                scanRequestCaller[r].resolve();
            }
            vm.isScanning = false;
            if (vm.scannedDevices.length > 0) {
                vm.isNextShow = true;
            }
            var bui = blockUI.instances.get('BlockUIForScanning');
            bui.stop();
            printAndAppendScanResult("Stop Scaning.");
        }

        function goConfigDev() {
            vm.tabConfigDevActive = true;
            stopScan();
        }

        function initScan() {
            vm.isScanning = true;
            vm.isNextShow = false;
            vm.foundIPs = [];
            scanRequestsTimer = [];
            scanRequestCaller = [];
            vm.scannedDevices = [];
            vm.isStartConfigureDisabled = true;
            calSTableHeight();
            clearScanResult();
            var bui = blockUI.instances.get('BlockUIForScanning');
            bui.start('Waiting for scanning...');
        }

        function appendScannedDevice(data, ipAddress) {

            vm.foundIPs.push(ipAddress);
            var result = data.data.results;
            result.ip = ipAddress;
            result.index = vm.scannedDevices.length;
            vm.scannedDevices.push(result);
            calSTableHeight();

            var isInModelIdArray = false;
            for (var i in vm.scannedModelId) {
                if (vm.scannedModelId[i] == result.model_id){
                    isInModelIdArray = true;
                    break;
                }
            }
            if (!isInModelIdArray) {
                vm.scannedModelId.push(result.model_id);
            }
        }

        function printScanError(msg, data, error) {
            vm.deviceScanFailResult = 
                vm.deviceScanFailResult?vm.deviceScanFailResult:""  + (vm.deviceScanFailResult? "\n": "") + msg;
            if (data && data.data) {
                var jsonObj = data.data
                vm.deviceScanFailResult = vm.deviceScanFailResult + 
                    "\n\nHTTP " + data.status + " " + data.statusText + "\n" +
                    "Responsed JSON content: " + JSON.stringify(jsonObj);
            }
            if (error) {
                vm.deviceScanFailResult += "\n\nError:\n"
                vm.deviceScanFailResult += error.message + "\n";
                vm.deviceScanFailResult += error.stack + "\n";
            }

            vm.deviceScanFailResult += "\nPlease check console log for more information.\n"
        }

        function printAndAppendScanResult(msg, data) {
            vm.deviceScanResult = vm.deviceScanResult + (vm.deviceScanResult? "\n": "") + msg;
            if (data) {
                vm.deviceScanResult = vm.deviceScanResult + "\n" + JSON.stringify(data.data, null, 2);
            }
        }

        function clearScanResult() {
            vm.deviceScanResult = "";
            vm.deviceScanFailResult = "";
        }

        function addNewRange() {
            vm.ipCandidates.push({index:RangeIpIndex++});
            checkRemoveRangeButton();
        }

        function removeRange(item) {
            for (var i=0; i < vm.ipCandidates.length; i++) {
                if (vm.ipCandidates[i].index == item.index) {
                    vm.ipCandidates.splice(i, 1);
                }
            }

            checkRemoveRangeButton();
        }

        function checkRemoveRangeButton() {
            if (vm.ipCandidates.length <= 1) {
                vm.isRemoveRangeBtnShowing = false;
            } else {
                vm.isRemoveRangeBtnShowing = true;
            }
        }

        // ---------- End of For Scan Tab ---------- 

        // ---------- For Configure Tab ---------- 
        function clearInput() {
            vm.current_password = "";
            vm.configure = {};
            sessionStorage.removeItem('cacheConfigurationData');
            cacheConfigurationData = {};

        }

        function onSTableClick(row) {
            if (row.isSelected) {
                row.isSelected = false;
            } else {
                row.isSelected = true;
            }

            //vm.displayScannedDevices[row.index].isSelected = row.isSelected;
            vm.scannedDevices[row.index].isSelected = row.isSelected;
            if (row.isSelected) {
                checkAllDisplayDevicesSelected();
            } else {
                vm.STableSelectAllDevices = false;
            } 
            checkReadyToConfigure();
        }
        function onSTableAllChecked() {
            var selected = vm.STableSelectAllDevices;
            for (var i in vm.displayScannedDevices) {
                vm.displayScannedDevices[i].isSelected = selected;
                vm.scannedDevices[vm.displayScannedDevices[i].index].isSelected = selected;
            }
            checkReadyToConfigure();
        }

        function calSTableHeight() {
            var HEIGHT_MAX_SIZE = 15;
            if (!vm.scannedDevices.length) {
                vm.deviceSelectSize = 10;
            } else if (vm.scannedDevices.length < HEIGHT_MAX_SIZE) {
                vm.deviceSelectSize = 7 + (vm.scannedDevices.length * 3);
            } else {
                vm.deviceSelectSize = 7 + (HEIGHT_MAX_SIZE * 3);
            }
            vm.STableStyle={'height':vm.deviceSelectSize+'em'};
        }

        function startConfigure() {
            if (vm.isConfiguring) {
                stopConfigure();
                return;
            }

            if (!validateConfigInput()) {
                return;
            }
            if (!checkReadyToConfigure()) {
                printConfigureError("Unable to configure. Please select at leaset one device.");
                return;
            }
            initStartConfigure();

            for (var devIdx in vm.scannedDevices) {
                if (isGlobalConfigureBreak) break;
                if (!vm.scannedDevices[devIdx].isSelected) continue;

                vm.scannedDevices[devIdx].isConfigureBreak = false;
                var caseReadyArray = [{ready:1, idx:0}];
                var configCases = [];
                configuringNum += configureCases.length;
                for (var i = 0; i < configureCases.length; i++) {
                    tryConfigureNext(caseReadyArray, i, vm.scannedDevices[devIdx]);
                }
            }

        }

        function initStartConfigure() {
            var bui = blockUI.instances.get('BlockUIForConfigure');
            bui.start('Waiting for Configuration Complete...');
            cacheConfigurationData = {};
            cacheConfigurationData.current_password = vm.current_password;
            cacheConfigurationData.configure = vm.configure;
            sessionStorage.cacheConfigurationData = angular.toJson(cacheConfigurationData);

            isGlobalConfigureBreak = false;
            vm.isConfiguring = 1;

            clearConfigureResult();

            configuringNum = 0;
            configuringDoneNum = 0;
        }

        function stopConfigure() {
            var bui = blockUI.instances.get('BlockUIForConfigure');
            if (configuringNum == configuringDoneNum) {
                bui.stop();
                printAndAppendConfigureResult("Configuration Stop.");
                vm.isConfiguring = 0;
            } else {
                bui.stop();
                bui.start("Stopping Configuration...");
                vm.isConfiguring = 2;
            }

            isGlobalConfigureBreak = true;

        }

        function openAllConfigAccordion(open) {
            for (var i in vm.accordion) {
                vm.accordion[i] = open;
            }
        }

        function validateConfigInput() {
            vm.isConfigClicked = true;
            var configForm = vm.formScope.ConfigForm;
            if (configForm.$valid) {
                return true;
            }
            $scope.$broadcast('show-errors-check-validity');
            //openAllConfigAccordion(true);
            //printConfigureError("Following input is invalid.");
            for (var item in configForm) {
                if (configForm[item] && configForm[item]["$invalid"]) {
                    if (document.getElementsByName(item)[0]) {
                        var parent = angular.element(document.getElementsByName(item)[0]).scope().$parent;
                        if (parent && 
                            typeof parent.isOpen != 'undefined' &&
                            !parent.isOpen) {
                            parent.isOpen = true;
                        }
                    }
                    //printConfigureError(item);
                }
            }
            return false;


        }
        function setFormScope(scope) {
            vm.formScope = scope;
        }

        function checkReadyToConfigure() {
            var status = false;
            for (var i in vm.scannedDevices) {
                if (vm.scannedDevices[i].isSelected) {
                    status = true;
                    break;
                }
            }
            vm.isStartConfigureDisabled = !status;
            return status;
        }


        function tryConfigureNext(caseReadyArray, caseNumber, device) {
            //if (isGlobalConfigureBreak) return;

            if (!caseReadyArray[caseNumber+1]) {
                caseReadyArray[caseNumber+1] = {ready: 0, idx:(caseNumber+1)};
            }
            if (caseReadyArray[caseNumber].ready == 1) {
                runConfigureCase(caseReadyArray[caseNumber+1], caseNumber, device);
                return;
            }
            $timeout(function(){
                tryConfigureNext(caseReadyArray, caseNumber, device);
            }, 100);
        }

        function runConfigureCase(nextCaseReadiness, caseIdx, device) {
            if (isGlobalConfigureBreak || device.isConfigureBreak) {
                if (configureCases[caseIdx] == "DoneConfig") {
                    //printConfigureError("Configuration of Device " + deviceToString(device) + " is broken due to some error.");
                }
                readyForNextConfig(device, nextCaseReadiness, false);
                return;
            }
            var configKey = configureCases[caseIdx];
            if (configKey == "GetToken") {
                QRC.setTargetIpAddress(device.ip, device.index);
                QRC.getToken(vm.current_password, device.index)
                    .then(successGetTokenFn, errorConfigFn);
            } else if (configKey == "DoneConfig") {
                //for (var k = 0; k < 1000000000; k++) {var c = 0;}
                printAndAppendConfigureResult("Done Config device " +
                                              deviceToString(device));
                readyForNextConfig(device, nextCaseReadiness, true);
            } else if (vm.configure[configKey]) {
                if (!runConfigureByKey(configKey, device)) {
                    readyForNextConfig(device, nextCaseReadiness, false);
                }
            } else {
                // configKey doesn't exist, skip.
                readyForNextConfig(device, nextCaseReadiness, true);
            }


            function runConfigureByKey(configKey, device) {
                if (configKey == "PlayerName") {
                    QRC.setSettings("player_name",
                                    vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SecurityPassword") {
                    QRC.setSecurityPassword(
                        vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "Timezone") {
                    // TODO
                } else {
                    printConfigureError("Un-recognized configKey:" + configKey);
                    return false;
                }
                return true;
            }
            function successGetTokenFn(data) {
                QRC.setTargetAuthToken(data.data.access_token, device.index);
                readyForNextConfig(device, nextCaseReadiness, true);
            }
            function successConfigFn(data) {
                readyForNextConfig(device, nextCaseReadiness, true);
            }
            function errorConfigFn(data) {
                printConfigureError("When configuring " + configureCases[caseIdx] + ", device " + deviceToString(device) + " Response error:",
                                    data);
                readyForNextConfig(device, nextCaseReadiness, false);
            }
        }


        function readyForNextConfig(device, nextCaseReadiness, isSuccess) {
            configuringDoneNum++;
            if (configuringDoneNum == configuringNum) {
                if (isGlobalConfigureBreak) {
                    printConfigureError("Configuration Stopped.");
                } else {
                    var allDeviceComplete = true;
                    var allDeviceFailed = true;
                    for(var i in vm.scannedDevices) {
                        if (vm.scannedDevices[i].isSelected) {
                            if (vm.scannedDevices[i].isConfigureBreak) {
                                allDeviceComplete = false;
                            } else {
                                allDeviceFailed = false;
                            }
                        }
                    }
                    if (allDeviceComplete) {
                        printAndAppendConfigureResult("Good. All devices are done configuration.");
                    } else {
                        printConfigureError("\nFollowing devices are NOT completely configured:");
                        if (!allDeviceFailed) {
                            printAndAppendConfigureResult("\n Following device are completely configured:");
                        }
                        for(var i in vm.scannedDevices) {
                            if (vm.scannedDevices[i].isSelected) {
                                if (vm.scannedDevices[i].isConfigureBreak) {
                                    printConfigureError(deviceToString(vm.scannedDevices[i]));
                                } else {
                                    printAndAppendConfigureResult(deviceToString(vm.scannedDevices[i]));
                                }
                            }
                        }   
                    }

                }
                stopConfigure();
            }
            nextCaseReadiness.ready = 1;
            if (!isSuccess) {
                device.isConfigureBreak = true;
            }
        }

        function printConfigureError(msg, data, error) {
            var oldMsg = vm.deviceConfigureFailResult?vm.deviceConfigureFailResult:"";
            if (oldMsg) oldMsg+= "\n";
            vm.deviceConfigureFailResult = oldMsg + msg;
            if (data && data.data) {
                var jsonObj = data.data
                vm.deviceConfigureFailResult = vm.deviceConfigureFailResult + 
                    "\nHTTP " + data.status + " " + data.statusText + "\n" +
                    "Responsed JSON content: " + JSON.stringify(jsonObj);
            }
            if (error) {
                vm.deviceConfigureFailResult += "\n\nError:\n"
                vm.deviceConfigureFailResult += error.message + "\n";
                vm.deviceConfigureFailResult += error.stack + "\n";
            }

            //vm.deviceConfigureFailResult += "\nPlease check console log to see if there are more information.\n"
        }

        function printAndAppendConfigureResult(msg, data) {
            vm.deviceConfigureResult = vm.deviceConfigureResult + (vm.deviceConfigureResult? "\n": "") + msg;
            if (data) {
                vm.deviceConfigureResult = vm.deviceConfigureResult + "\n" + JSON.stringify(data.data, null, 2);
            }
        }

        function clearConfigureResult() {
            vm.deviceConfigureResult = "";
            vm.deviceConfigureFailResult = "";
        }
        // ---------- End of For Configure Tab ---------- 


        // ---------- Utils ---------- 


        function deviceToString(device) {
            return device.ip + " " + 
                device.model_id + " " +
                device.player_name + " " +
                device.serial_number;
        }

        function isIpRangeValid(start_ip, end_ip) {
            var start_prefix = start_ip.replace(/\.[\d]+$/, '');
            var end_prefix = end_ip.replace(/\.[\d]+$/, '');
            if (start_prefix == end_prefix) {
                return true;
            }
            return false;
        }
        function ValidateIPaddress(ipaddress) {
            var patt = new RegExp(vm.ipPattern);
            if (patt.test(ipaddress)) {
                return true;
            }
            return false;
        }


        function getLocalIp(getIpFn) {
            // NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
            var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

            if (RTCPeerConnection) (function () {
                var rtc = new RTCPeerConnection({iceServers:[]});
                if (1 || window.mozRTCPeerConnection) {      // FF [and now Chrome!] needs a channel/stream to proceed
                    rtc.createDataChannel('', {reliable:false});
                };

                rtc.onicecandidate = function (evt) {
                    // convert the candidate to SDP so we can run it through our general parser
                    // see https://twitter.com/lancestout/status/525796175425720320 for details
                    if (evt.candidate) grepSDP("a="+evt.candidate.candidate);
                };
                rtc.createOffer(function (offerDesc) {
                    grepSDP(offerDesc.sdp);
                    rtc.setLocalDescription(offerDesc);
                }, function (e) { console.warn("offer failed", e); });


                var addrs = Object.create(null);
                addrs["0.0.0.0"] = false;
                //updateDisplay("2001::9d38:6abd:18ce:959:3f57:feeb");
                //addrs["192.168.0.43"] = true;
                //addrs["192.168.2.43"] = true;
                /*
                for (var i = 19; i<=20;i++) {
                    if (i == 1) continue;
                    addrs["192.168." + i + ".43"] = true;
                }
                addrs["192.168." + 1 + ".43"] = true;
                for (var i = 21; i<=30;i++) {
                    addrs["192.168." + i + ".43"] = true;
                }
                */
                var timeoutHandler = $timeout(function(addrs) {getIpFn(addrs);}, 5000, true, null);
                function updateDisplay(newAddr) {
                    if (!ValidateIPaddress(newAddr)) return;
                    if (newAddr in addrs) return;
                    else addrs[newAddr] = true;
                    var displayAddrs = Object.keys(addrs).filter(function (k) { 
                        return addrs[k]; 
                    });
                    $timeout.cancel(timeoutHandler);
                    timeoutHandler = $timeout(function(addrs) {getIpFn(addrs);}, 1000, true, displayAddrs);
                }

                function grepSDP(sdp) {
                    var hosts = [];
                    sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
                        if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
                            var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                                addr = parts[4],
                                type = parts[7];
                            if (type === 'host') updateDisplay(addr);
                        } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                            var parts = line.split(' '),
                                addr = parts[2];
                            updateDisplay(addr);
                        }
                    });
                }
            })(); else {
                return false;
            }
            return true;
        }

        function onGetIp(addrs) {
            if (!addrs || addrs.length == 0) {
                vm.ipCandidates.push({});
            } else {
                var tmpRange = Object.create(null);
                for (var i = 0; i< addrs.length; i++) {
                    var range_start = addrs[i].replace(/\.[\d]+$/, '.1');
                    var range_end = addrs[i].replace(/\.[\d]+$/, '.254');
                    if (range_start in tmpRange) {
                        continue;
                    }
                    tmpRange[range_start] = true;
                    vm.ipCandidates.push({range_start:range_start, range_end:range_end, index:RangeIpIndex++});
                }
            }
            vm.isScanDisabled = false;
            checkRemoveRangeButton();
        }
        function watchScannedDevices() {
            $scope.$watch(
                'vm.displayScannedDevices', function(newValue) {
                    checkAllDisplayDevicesSelected();
                });
        }


        function checkAllDisplayDevicesSelected() {
            if (!vm.displayScannedDevices.length) {
                vm.STableSelectAllDevices = false;
                return;
            }
            vm.STableSelectAllDevices = true;
            for (var i in vm.displayScannedDevices) {
                if (!vm.displayScannedDevices[i].isSelected) {
                    vm.STableSelectAllDevices = false;
                    break;
                }
            }
        }


    }


    angular
        .module('qrc-center.configuration.controllers')
        .filter('myStrictFilter', function($filter){
        return function(input, predicate){
            return $filter('filter')(input, predicate, true);
        }
    });

    angular
        .module('qrc-center.configuration.controllers')
        .filter('unique', function() {
        return function (arr, field) {
            var o = {}, i, l = arr.length, r = [];
            for(i=0; i<l;i+=1) {
                o[arr[i][field]] = arr[i];
            }
            for(i in o) {
                r.push(o[i]);
            }
            return r;
        };
    });


})();
