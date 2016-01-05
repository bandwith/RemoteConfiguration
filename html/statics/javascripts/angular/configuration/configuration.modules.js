(function () {
    'use strict';

    angular
        .module('qrc-center.configuration', [
        'qrc-center.configuration.controllers',
        //'qrc-center.configuration.directives',
        //'qrc-center.configuration.config-input',
        'qrc',
        'rzModule',
        'angular-timezone-selector'
    ]);

    angular.module('qrc-center.configuration.controllers', []);
    //angular.module('qrc-center.configuration.directives', []);
    //angular.module('qrc-center.configuration.config-input', []);
})();
