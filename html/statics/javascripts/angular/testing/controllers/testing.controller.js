(function () {
    'use strict';

    angular
        .module('qrc.testing.controllers')
        .controller('TestingController', TestingController);

    TestingController.$inject = [];

    function TestingController() {
        var vm = this;
        activate();
        
        function activate() {
            
        }
        
        function testAll() {
            console.log("start test device " + vm.test_ip);
        }
        vm.testAll = testAll;
    }
})();