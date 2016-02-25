(function() {
    'use strict';
    angular.module('qrc-center.routes')
        .config(config);

    config.$inject = ['$routeProvider'];

    /**
     * @name config
     * @desc Define valid application routes
     */
    function config($routeProvider) {
        $routeProvider.when('/testing/', {
            controller: 'TestingController',
            controllerAs: 'vm',
            templateUrl: 'testing.html',
            activeTab: 'testing'
        }).when('/example/', {
            controller: 'ExampleController',
            controllerAs: 'vm',
            templateUrl: 'example.html',
            activeTab: 'login'
        }).when('/configuration/', {
            controller: 'ConfigurationController',
            controllerAs: 'vm',
            templateUrl: 'configuration.html',
            activeTab: 'login'
        }).when('/', {
            controller: 'MainController',
            controllerAs: 'vm',
            templateUrl: 'main.html',
            activeTab: 'main'
        });
    }
})();
