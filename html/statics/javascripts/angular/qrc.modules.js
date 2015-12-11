(function () {
    'use strict';
    angular.module('qrc', [
        'qrc.routes',
        'qrc.main',
        'qrc.testing',
        'ui.bootstrap'
    ]);

    angular.module('qrc.routes', ['ngRoute']);
    angular.module('qrc').run(run);
    run.$inject = ['$http'];
    function run($http) {

    }
})();
