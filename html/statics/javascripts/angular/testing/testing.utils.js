(function () {
    'use strict';
    angular.module('qrc-center.testing.utils').factory('TestingUtils', TestingUtils);

    TestingUtils.$inject = [];

    function TestingUtils() {

        var TestingUtils = {
            checkResults: checkResults,
            getFnName: getFnName,
        };
        return TestingUtils;

        function checkResults(result, expectData, key) {
            if (expectData == null) {
                return;
            }
            if (typeof result === 'undefined' || result == null) {
                throw new Error("result doesn't exist. Expect key:" + key);
            }
            if (expectData != null) {
                if (typeof(result) !== expectData[0]) {
                    throw new Error(("expect type " + expectData[0] +
                                     " but result is " + typeof(result)));
                }
                if (expectData[1] && expectData[1] == "s") {
                    return checkStartsWith(result, expectData[2]);
                } else if (expectData[1] && expectData[1] == "=") {
                    return checkEquals(result, expectData[2]);
                } else if (expectData[1] && expectData[1] == "!=") {
                    return checkNotEquals(result, expectData[2]);
                } else if (expectData[1] && expectData[1] == ">") {
                    return checkLarger(result, expectData[2]);
                } else if (expectData[1]) {
                    throw new Error("un-recognized testingData: " + expectData[1]);
                }
                return true;
            } else {
                throw new Error("expectData should not be null");
            }
        }
        function checkStartsWith(result, str) {
            if (!(result.substring(0,str.length) == str)) {
                throw new Error(result + " does not starts with " + str);
            }
        }
        function checkEquals(result, str) {
            if (result != str) {
                throw new Error(result + " does not equal " + str);
            }
        }
        function checkNotEquals(result, str) {
            if (result == str) {
                throw new Error(result + " does equal " + str);
            }
        }

        function checkLarger(result, num) {
            if (!(result > num)) {
                throw new Error(result + " does not larger than " + num);
            }
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