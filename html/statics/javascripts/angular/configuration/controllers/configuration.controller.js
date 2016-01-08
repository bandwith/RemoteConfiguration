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
        var isGlobalConfigureBreakDone = false;
        var totalConfigureNum = 0;
        var configuringDoneNum = 0;

        var selectedDevices = [];
        var currentConfigDeviceIndex = 0;
        var CONCURRENT_CONFIG_DEVICE = 10;

        var configTimeStart;

        var configureCases = [
            "GetToken",
            "SettingsPlayerName",
            "SettingsNtpServer",
            "SettingsSmilContentUrl",
            "SettingsRebootTime",
            "SettingsRebootTimeOptimized",
            "AudioStreamMusic",
            "AudioStreamNotification",
            "AudioStreamAlarm",
            "Timezone",
            "SettingsAdbOverTcp",
            "TmpDisableAdb", // MUST after SettingsAdbOverTcp to restart adb server
            "SettingsAdbEnabled",
            "SecurityPassword", // Always put Password at last one config.
            "WifiState",
            "WifiNetwork",
            "EthernetNetwork",
            "EthernetState",
            "DoneConfig",
        ];
        var vm = this;


        activate();

        function activate() {
            vm.current_password = "";
            vm.configure = {};
            vm.useConfig = {};

            if (sessionStorage && sessionStorage.cacheConfigurationData) {
                try {
                    cacheConfigurationData = angular.fromJson(sessionStorage.cacheConfigurationData);
                } catch (err) {
                    console.warn("unable to read sessionStorage, clear cacehData.");
                    sessionStorage.removeItem('cacheConfigurationData');
                }
                vm.current_password = cacheConfigurationData.current_password;
                vm.configure = cacheConfigurationData.configure;
                convertConfiguration();
                vm.useConfig = cacheConfigurationData.useConfig;
            }

            vm.ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

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
            vm.deleteConfig = deleteConfig;
            vm.translateStreamVolume = translateStreamVolume;
            vm.checkInitConfig = checkInitConfig;
            vm.checkEthernetConfig = checkEthernetConfig;
            vm.checkInitWifiConfig = checkInitWifiConfig;
            vm.displayScannedDevices = [];
            vm.selectedScannedDevices = [];
            //vm.selectedFinalDevices = [];
            //vm.finalDevices = [];
            vm.scannedModelId = [];
            vm.isStartConfigureDisabled = true;
            vm.isConfiguring = 0;
            vm.isConfigClicked = false;

            calSTableHeight();


            if (!getLocalIp(onGetIp)){
                onGetIp(null);
            }

            watchScannedDevices();
            watchSliders();
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


            for (var k=0;k<51;k++) {
                appendScannedDevice({data:{results:{model_id:'FHD123',player_name:'AAA', serial_number:'AAA'}}}, '192.168.1.131');
                appendScannedDevice({data:{results:{model_id:'TD123',player_name:'BBB', serial_number:'BBB'}}}, '192.168.1.171');
                appendScannedDevice({data:{results:{model_id:'TD123',player_name:'CCC', serial_number:'BBB'}}}, '192.168.1.172');
                appendScannedDevice({data:{results:{model_id:'TD123',player_name:'DDD', serial_number:'BBB'}}}, '192.168.1.178');
                appendScannedDevice({data:{results:{model_id:'TD123',player_name:'EEE', serial_number:'BBB'}}}, '192.168.1.183');
            }



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
            vm.useConfig = {};
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
            configTimeStart = new Date();
            initStartConfigure();
            for (var devIdx in vm.scannedDevices) {
                if (vm.scannedDevices[devIdx].isSelected) {
                    selectedDevices.push(vm.scannedDevices[devIdx]);
                    totalConfigureNum += configureCases.length;
                }
            }
            for (var i = 0; i < CONCURRENT_CONFIG_DEVICE + 1; i++) {
                if (currentConfigDeviceIndex < selectedDevices.length) {
                    tryConfigDevice(currentConfigDeviceIndex);
                    currentConfigDeviceIndex++;
                }
            }
        }

        function configOneMoreDevice() {
            if (currentConfigDeviceIndex < selectedDevices.length) {
                tryConfigDevice(currentConfigDeviceIndex);
                currentConfigDeviceIndex++;
            }
        }

        function tryConfigDevice(devIdx) {
            if (devIdx < selectedDevices.length) {
                selectedDevices[devIdx].isConfigFailed = false;
                selectedDevices[devIdx].isConfigComplete = false;
                if (isGlobalConfigureBreak) return;

                runConfigureCase(0, selectedDevices[devIdx]);

            }            
        }

        function initStartConfigure() {
            var bui = blockUI.instances.get('BlockUIForConfigure');
            bui.start('Waiting for Configuration Complete...');
            cacheConfigurationData = {};
            cacheConfigurationData.current_password = vm.current_password;
            cacheConfigurationData.configure = vm.configure;
            cacheConfigurationData.useConfig = vm.useConfig;
            sessionStorage.cacheConfigurationData = angular.toJson(cacheConfigurationData);

            isGlobalConfigureBreak = false;
            isGlobalConfigureBreakDone = false;
            vm.isConfiguring = 1;

            clearConfigureResult();

            totalConfigureNum = 0;
            configuringDoneNum = 0;

            currentConfigDeviceIndex = 0;

            selectedDevices = [];
        }

        function stopConfigure() {
            var bui = blockUI.instances.get('BlockUIForConfigure');
            if (totalConfigureNum == configuringDoneNum) {
                bui.stop();
                printAndAppendConfigureResult("Configuration Stop.");
                vm.isConfiguring = 0;
            } else {
                bui.stop();
                bui.start("Stopping Configuration...");
                vm.isConfiguring = 2;
            }

            isGlobalConfigureBreak = true;
            var currentTime = new Date();
            var timeDiff = currentTime - configTimeStart;
            console.log("It took " + timeDiff/1000 + " seconds to configure devices.");
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

        function runConfigureCase(caseIdx, device, isSimulate) {
            var isRemoteRequest = false;
            var configKey = configureCases[caseIdx];
            if (isGlobalConfigureBreak || device.isConfigFailed) {
                readyForNextConfig(device, caseIdx, false);
                if (configKey == "DoneConfig") {
                    $timeout(configOneMoreDevice, 100);
                }
                return;
            }

            if (configKey == "GetToken") {
                isRemoteRequest = true;
                if (!isSimulate) {
                    QRC.setTargetIpAddress(device.ip, device.index);
                    QRC.getToken(vm.current_password, device.index)
                        .then(successGetTokenFn, errorConfigFn);
                }
            } else if (configKey == "DoneConfig") {
                if (!isSimulate) {
                    //for (var k = 0; k < 1000000000; k++) {var c = 0;}
                    printAndAppendConfigureResult("Done Config device " +
                                                  deviceToString(device));
                    device.isConfigComplete = true;
                    if (device.isConfigFailed) {
                        consoel.error("What?!");
                    }
                    readyForNextConfig(device, caseIdx, true);
                    $timeout(configOneMoreDevice, 100);
                }
            } else if (vm.useConfig[configKey]) {
                isRemoteRequest = true;
                if (!isSimulate) {
                    runConfigureByKey(configKey, caseIdx, device, isSimulate);
                }
            } else {
                if (!isSimulate) {
                    // configKey doesn't exist, skip.
                    readyForNextConfig(device, caseIdx, true);
                }
            }
            return isRemoteRequest;


            function netMaskToPrefixLength(mask) {
                var maskNodes = mask.match(/(\d+)/g);
                var cidr = 0;
                for(var i in maskNodes)
                {
                    cidr += (((maskNodes[i] >>> 0).toString(2)).match(/1/g) || []).length;
                }
                return cidr;
            }


            function runConfigureByKey(configKey, caseIdx, device) {
                if (configKey == "SettingsPlayerName") {
                        QRC.setSettings("player_name",
                                        vm.configure[configKey], device.index)
                            .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SettingsNtpServer") {
                    QRC.setSettings("ntp_server",
                                    vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SettingsSmilContentUrl") {
                    QRC.setSettings("smil_content_url",
                                    vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SettingsRebootTime") {
                    var timeObj = vm.configure[configKey];
                    if (!timeObj) {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                    var hour = timeObj.getHours();
                    hour = hour>=10?hour:("0"+hour);
                    var minute = timeObj.getMinutes();
                    minute = minute>10?minute:("0"+minute);
                    var timeStr = hour + ":" + minute;
                    QRC.setSettings("reboot_time", timeStr, device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SettingsRebootTimeOptimized") {
                    if (vm.configure.SettingsRebootTimeOptimized == "enable") {
                        QRC.setSettings("is_reboot_optimized", true, device.index)
                            .then(successConfigFn, errorConfigFn);
                    } else {
                        QRC.setSettings("is_reboot_optimized", false, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                } else if (configKey == "SettingsAdbOverTcp") {
                    if (vm.configure.SettingsAdbOverTcp == "enable") {
                        QRC.setProp("persist.adb.tcp.port", 5555, device.index)
                            .then(successConfigFn, errorConfigFn);
                    } else {
                        QRC.setProp("persist.adb.tcp.port", -1, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                    vm.useConfig.TmpDisableAdb = true;
                    vm.useConfig.SettingsAdbEnabled = true;
                } else if (configKey == "TmpDisableAdb") {
                    delete vm.useConfig["TmpDisableAdb"];
                    QRC.setSettings("adb_enabled", false, device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "SettingsAdbEnabled") {
                    if (vm.configure.SettingsAdbEnabled == "enable") {
                        QRC.setSettings("adb_enabled", true, device.index)
                            .then(successConfigFn, errorConfigFn);
                    } else {
                        QRC.setSettings("adb_enabled", false, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                } else if (configKey == "SecurityPassword") {
                    QRC.setSecurityPassword(
                        vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "Timezone") {
                    if (!vm.configure[configKey]) {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                    QRC.setProp("persist.sys.timezone", vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "AudioStreamMusic") {
                    if (vm.configure[configKey] == -1 || isNaN(vm.configure[configKey])) {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                    QRC.setAudioVolume(
                        "stream_music", vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "AudioStreamNotification") {
                    if (vm.configure[configKey] == -1 || isNaN(vm.configure[configKey])) {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                    QRC.setAudioVolume(
                        "stream_notification", vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "AudioStreamAlarm") {
                    if (vm.configure[configKey] == -1 || isNaN(vm.configure[configKey])) {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                    QRC.setAudioVolume(
                        "stream_alarm", vm.configure[configKey], device.index)
                        .then(successConfigFn, errorConfigFn);
                } else if (configKey == "EthernetState") {
                    if (vm.configure.EthernetState == "enable") {
                        QRC.setEth0State(1, device.index)
                            .then(successConfigFn, errorConfigFn);
                    } else {
                        QRC.setEth0State(0, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                } else if (configKey == "EthernetNetwork") {
                    if (vm.configure.EthernetNetwork.hasOwnProperty("ip_assignment")) {

                        if (vm.configure.EthernetNetwork.ip_assignment == "dhcp") {
                            var ethConfig = {ip_assignment: "dhcp"};
                            QRC.setEth0Network(ethConfig, device.index)
                                .then(successConfigFn, errorConfigFn);
                        } else if (vm.configure.EthernetNetwork.ip_assignment == "static") {
                            vm.configure.EthernetNetwork.network_prefix_length =
                                netMaskToPrefixLength(vm.configure.EthernetNetwork.netMask);
                            QRC.setEth0Network(vm.configure.EthernetNetwork, device.index)
                                .then(successConfigFn, errorConfigFn);
                        }
                    } else {
                        readyForNextConfig(device, caseIdx, true);
                        return false;
                    }
                } else if (configKey == "WifiState") {
                    if (vm.configure.WifiState == "enable") {
                        QRC.setWifiState(1, device.index)
                            .then(successConfigFn, errorConfigFn);
                    } else {
                        QRC.setWifiState(0, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                } else if (configKey == "WifiNetwork") {
                    // Make sure wifi is enabled before config it,
                    // otherwise configuration will not take effect.
                    var retry = 0;
                    var MAX_RETRY = 20;
                    var RETRY_DELAY = 1000; //we give it 20 (20 * 1000ms) sec to retry wifi network setup
                    QRC.getWifiState(device.index).then(success1stWifiFn, errorConfigFn);
                    function success1stWifiFn(data) {
                        if (data.data.value == "enabled") {
                            realConfigWifiNetwork();
                        } else {
                            QRC.setWifiState(1, device.index);
                            retry++;
                            $timeout(tryConfigWifiNetwork, RETRY_DELAY);
                        }
                    }
                    function tryConfigWifiNetwork() {
                        QRC.getWifiState(device.index).then(successWifiFn, errorConfigFn);
                        function successWifiFn(data) {
                            if (data.data.value == "enabled") {
                                realConfigWifiNetwork();
                            } else if (retry >= MAX_RETRY) {
                                printConfigureError("When configuring " + configureCases[caseIdx] +
                                                    ", device " + deviceToString(device) +
                                                    " Unable to enable Wifi");
                                readyForNextConfig(device, caseIdx, false);
                            } else {
                                retry++;
                                $timeout(tryConfigWifiNetwork, RETRY_DELAY);
                            }
                        }
                    }

                    function realConfigWifiNetwork() {
                        if (vm.configure.WifiNetwork.hasOwnProperty("advanced")) {
                            if (vm.configure.WifiNetwork.advanced.hasOwnProperty("ip_assignment") &&
                                vm.configure.WifiNetwork.advanced.ip_assignment == "static") {
                                vm.configure.WifiNetwork.advanced.network_prefix_length =
                                    netMaskToPrefixLength(vm.configure.WifiNetwork.advanced.netMask);
                            }
                            // TODO: Set proxy
                        }
                        QRC.setWifiNetwork(vm.configure.WifiNetwork, device.index)
                            .then(successConfigFn, errorConfigFn);
                    }
                } else {
                    printConfigureError("Un-recognized configKey:" + configKey);
                    readyForNextConfig(device, caseIdx, false);
                }
            }
            function successGetTokenFn(data) {
                QRC.setTargetAuthToken(data.data.access_token, device.index);
                readyForNextConfig(device, caseIdx, true);
            }
            function successConfigFn(data) {
                readyForNextConfig(device, caseIdx, true);
            }
            function errorConfigFn(data) {
                printConfigureError("When configuring " + configureCases[caseIdx] + ", device " + deviceToString(device) + " Response error:",
                                    data);
                readyForNextConfig(device, caseIdx, false);
            }
        }


        function readyForNextConfig(device, caseIdx, isSuccess) {
            configuringDoneNum++;
            if (!isSuccess) {
                device.isConfigFailed = true;
            }
            //console.log("configuringDoneNum:" + configuringDoneNum);
            if ((caseIdx+1) < configureCases.length) {
                var isRemoteRequest = runConfigureCase(caseIdx+1, device, true);
                var timeDelay = isRemoteRequest? 150:0;
                $timeout(runConfigureCase, timeDelay, true, caseIdx+1, device);
            }


            if (configuringDoneNum == totalConfigureNum ||
                (isGlobalConfigureBreak && !isGlobalConfigureBreakDone)) {
                if (isGlobalConfigureBreak) {
                    isGlobalConfigureBreakDone = true;
                    configuringDoneNum = totalConfigureNum;
                    printConfigureError("Configuration Stopped.");
                }
                var anyDeviceFailed = false;
                for(var i in selectedDevices) {
                    if (!selectedDevices[i].isConfigComplete) {
                        anyDeviceFailed = true;
                    }
                }
                if (anyDeviceFailed) {
                    printConfigureError("\nFollowing devices are NOT completely configured:");
                    for(var i in selectedDevices) {
                        if (!selectedDevices[i].isConfigComplete) {
                            printConfigureError(deviceToString(selectedDevices[i]));
                        } else {
                            printAndAppendConfigureResult(deviceToString(selectedDevices[i]));
                        }
                    }   
                } else {
                    printAndAppendConfigureResult("Good. All devices are done configuration.");
                }

                stopConfigure();
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
                device.model_id + " (" +
                device.player_name + ") " +
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
        function convertConfiguration() {
            vm.configure.SettingsRebootTime = new Date(vm.configure.SettingsRebootTime);
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
                var timeoutHandler = $timeout(function(addrs) {getIpFn(addrs);}, 3000, true, null);
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

        function translateStreamVolume(value) {
            if (value == -1 || isNaN(value)) {
                return "";
            }
            return value;
        }

        function deleteConfig(configKey) {
            delete vm.configure[configKey];
        }
        function checkInitConfig(configKey, isChecked, value, isInitRebootTime) {
            if (isChecked) {
                if (isInitRebootTime) {
                    var d = new Date("January 1, 1972 04:00:00");
                    vm.configure[configKey] = d;
                } else if (typeof value == 'undefined') {
                    vm.configure[configKey] = "";
                } else {
                    vm.configure[configKey] = value;
                }
            } else if (!isChecked && vm.configure.hasOwnProperty(configKey)) {
                delete vm.configure[configKey];
                if (isInitRebootTime) {
                    vm.formScope.ConfigForm['rebootTime'].$setViewValue(undefined, true);
                    vm.formScope.ConfigForm['rebootTime'].$render();
                }
            }
        }
        function checkEthernetConfig(isChecked, firstLvKey, configKey, value) {
            if (isChecked) {
                vm.configure.EthernetNetwork = {
                    ip_assignment: 'dhcp'
                }
            } else {
                if (vm.configure.hasOwnProperty('EthernetNetwork')){
                    delete vm.configure['EthernetNetwork'];
                }
            }
        }
        function checkInitWifiConfig(isChecked) {
            if (isChecked) {
                vm.configure.WifiNetwork = {
                    method: 'connect',
                    security: 'none',
                    ssid: '',
                    advanced: {ip_assignment: 'dhcp'}
                }
            } else {
                if (vm.configure.hasOwnProperty('WifiNetwork')) {
                    delete vm.configure['WifiNetwork'];
                }
            }
        }
        function watchScannedDevices() {
            $scope.$watch(
                'vm.displayScannedDevices', function(newValue) {
                    checkAllDisplayDevicesSelected();
                });
        }

        function watchSliders() {
            $scope.$watch('vm.accordion.audioOpen', function(newValue) {
                $scope.$broadcast('rzSliderForceRender');
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
