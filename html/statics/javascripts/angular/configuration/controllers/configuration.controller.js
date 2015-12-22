(function () {
    'use strict';

    angular
        .module('qrc-center.configuration.controllers')
        .controller('ConfigurationController', ConfigurationController);

    ConfigurationController.$inject = ['QRC', '$scope', '$injector', '$timeout', '$http', '$q'];

    function ConfigurationController(QRC, $scope, $injector, $timeout, $http, $q) {

        var RangeIpIndex = 0;
        var scanRequestsTimer = [];
        var scanRequestCaller = [];
        var vm = this;


        activate();

        function activate() {
            if (sessionStorage && sessionStorage.cacheConfigurationData) {
                try {
                    cacheConfigurationData = angular.fromJson(sessionStorage.cacheConfigurationData);
                    QRC.setTargetAuthToken(cacheConfigurationData.accessToken);
                } catch (err) {
                    console.warn("unable to read sessionStorage, clear cacehData.");
                    sessionStorage.removeItem('cacheConfigurationData');
                }
            }
            vm.isScanDisabled = true;
            vm.isScanning = false;
            vm.isRemoveRangeBtnShowing = true;

            vm.addNewRange = addNewRange;
            vm.removeRange = removeRange;
            vm.startScan = startScan;
            vm.foundIPs = [];

            vm.ipCandidates = [];

            if (!getLocalIp(onGetIp)){
                onGetIp(null);
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
            }
        }

        function startScan() {
            if (vm.isScanning) {
                stopScan();
                return;
            }
            clearResult();
            vm.isScanning = true;
            vm.foundIPs = [];
            scanRequestsTimer = [];
            scanRequestCaller = [];
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
                    printError("Start IP '"+ range_start +"' is invalid.");
                    return;
                }
                if (!ValidateIPaddress(range_end)) {
                    printError("End IP '"+ range_end +"' is invalid.");
                    return
                };
                if (!isIpRangeValid(range_start, range_end)) {
                    printError("Invalid IP range:" +
                               range_start + "~" + range_end +
                               "\nShould be within a C Class IP (ex, 192.168.0.1 ~ 192.168.0.254)"); 
                    return;
                }
                var ip_start = parseInt(range_start.match(/\.[\d]+$/)[0].replace(/\./,''));
                var ip_end = parseInt(range_end.match(/\.[\d]+$/)[0].replace(/\./,''));
                if (ip_end < ip_start) {
                    printError("Start IP '" + range_start +
                               "' should be smaller than End IP '"+ range_end +"'");
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
            var timeCostEstimate = timeCost + SCAN_TIMEOUT;
            printAndAppendResult("This may take about " + timeCostEstimate/1000 + " seconds...");

            // Then, do the real scan
            scannedIPs = Object.create(null);
            var key = 'abcde';
            var myHashCode = QRC.getHashCode(key);
            timeCost = 0;

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
                    var req = $timeout(function(myIp) {
                        if (myIp == "192.168.1.25") {
                            console.log("request targetIP:" + targetIP);
                        }
                        var caller = $q.defer();

                        $http.get("http://" + myIp + ":8080/v1/public/info?key=" + key,
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
                        vm.foundIPs.push(parser.hostname);
                        printAndAppendResult("Found Target IP: " + parser.hostname + ", keep scanning..");

                    }
                    responseNum++;
                    console.log("responseNum:" + responseNum);
                    checkScanIsDone();

                }
                function errorScanFn(data) {
                    var parser = document.createElement('a');
                    parser.href = data.config.url;
                    if (parser.hostname == "192.168.1.25") {
                        console.log("error response from targetIP:" + targetIP);
                    }
                    responseNum++;
                    console.log("responseNum:" + responseNum);
                    checkScanIsDone();
                }
                function checkScanIsDone() {
                    if (responseNum == requestNum) {
                        printAndAppendResult("Done scan devices. All found devices:" + vm.foundIPs.join(","));
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
            printAndAppendResult("Stop Scaning.");
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

        function commonSuccessFn(data) {
            printAndAppendResult("Response Content:", data);
        }
        function commonErrorFn(data) {
            if (data && data.status == -1) {
                printErrorAndBreak("Cannot get response from the HTTP request. Is target IP alive?");
            } else {
                printErrorAndBreak("Error of running " + FnName, data);
            }
        }

        function setupEnv() {
            cacheConfigurationData = {};
            sessionStorage.cacheConfigurationData = angular.toJson(cacheConfigurationData);
            clearResult();
        }

        function printError(msg, data, error) {
            vm.configurate_fail_result = 
                vm.configurate_fail_result?vm.configurate_fail_result:""  + (vm.configurate_fail_result? "\n": "") + msg;
            if (data && data.data) {
                var jsonObj = data.data
                vm.configurate_fail_result = vm.configurate_fail_result + 
                    "\n\nHTTP " + data.status + " " + data.statusText + "\n" +
                    "Responsed JSON content: " + JSON.stringify(jsonObj);
            }
            if (error) {
                vm.configurate_fail_result += "\n\nError:\n"
                vm.configurate_fail_result += error.message + "\n";
                vm.configurate_fail_result += error.stack + "\n";
            }

            vm.configurate_fail_result += "\nPlease check console log for more information.\n"
        }
        function printAndAppendResult(msg, data) {
            vm.configurate_result = vm.configurate_result + (vm.configurate_result? "\n": "") + msg;
            if (data) {
                vm.configurate_result = vm.configurate_result + "\n" + JSON.stringify(data.data, null, 2);
            }
        }
        function clearResult() {
            vm.configurate_result = "";
            vm.configurate_fail_result = "";
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

        function isIpRangeValid(start_ip, end_ip) {
            var start_prefix = start_ip.replace(/\.[\d]+$/, '');
            var end_prefix = end_ip.replace(/\.[\d]+$/, '');
            if (start_prefix == end_prefix) {
                return true;
            }
            return false;
        }
        function ValidateIPaddress(ipaddress) {
            if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
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
                //addrs["192.168.0.43"] = true;
                //addrs["192.168.2.43"] = true;
                for (var i = 19; i<=20;i++) {
                    if (i == 1) continue;
                    addrs["192.168." + i + ".43"] = true;
                }
                addrs["192.168." + 1 + ".43"] = true;
                for (var i = 21; i<=30;i++) {
                    addrs["192.168." + i + ".43"] = true;
                }
                var timeoutHandler = $timeout(function(addrs) {getIpFn(addrs);}, 2000, true, null);
                function updateDisplay(newAddr) {
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

    }
})();
