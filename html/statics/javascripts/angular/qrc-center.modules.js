(function () {
    'use strict';
    angular.module('qrc-center', [
        'qrc-center.routes',
        'qrc-center.main',
        'qrc-center.configuration',
        'qrc-center.testing',
        'qrc-center.example',
        'qrc',
        'ui.bootstrap'
    ]);

    angular.module('qrc-center.routes', ['ngRoute']);
    angular.module('qrc-center').run(run);
    run.$inject = ['$http'];
    function run($http) {

    }
})();
