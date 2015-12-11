(function () {
    'use strict';

    angular
        .module('qrc-center.testing', [
        'qrc-center.testing.services',
        'qrc-center.testing.controllers',
        'qrc-center.testing.data',
        'qrc-center.testing.utils',
        'qrc'
    ]);

    angular.module('qrc-center.testing.services', []);
    angular.module('qrc-center.testing.controllers', []);
    angular.module('qrc-center.testing.data', []);
    angular.module('qrc-center.testing.utils', []);
})();
