(function () {
    'use strict';

    angular.module('qrc.controllers')
        .controller('QrcController', QrcController);

    QrcController.$inject = ['QRC'];

    /**
     * @namespace ToursCOntroller
     */
    function QrcController(QRC) {
        var vm = this;
       
        activate();

    }
})();