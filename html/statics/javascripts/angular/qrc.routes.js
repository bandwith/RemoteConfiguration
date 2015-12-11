(function() {
    'use strict';
    angular.module('qrc.routes')
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
            templateUrl: 'sub_pages/testing.html',
            activeTab: 'testing'
        }).when('/single_dev/', {
            controller: 'SingleDevController',
            controllerAs: 'vm',
            templateUrl: 'sub_pages/single_dev.html',
            activeTab: 'login'
        }).when('/', {
            controller: 'MainController',
            controllerAs: 'vm',
            templateUrl: 'sub_pages/main.html',
            activeTab: 'main'
        });
    }
})();
