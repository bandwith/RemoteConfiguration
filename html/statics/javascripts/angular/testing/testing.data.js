(function () {
    'use strict';
    angular.module('qrc-center.testing.data').factory('TestingData', TestingData);

    TestingData.$inject = [];

    function TestingData() {
        /*
         * Each element in commonDevInfo may have at most 3 item in its array content.
         * 1st item: is type of the key's value, can be string/number/boolean
         * 2nd item: is "s", ">", "=", "!="
                     "s" means starts with the following item.
                     ">" means larger than the following item.
                     "=" means equals as following item.
                     "!=" means not equal as following item.
         * 3rd item: the value for 2nd item to compare with.
         */
        var commonInfo = {
            fw_version:                ["string", "s", "v"],
            model_id:                  ["string"],
            ip_address:                ["string", "s", "192.168."],
            up_time:                   ["string"],
            total_storage_size_mb:     ["number", ">", 2000],
            available_storage_size_mb: ["number", ">", 3000],
            serial_number:             ["string", "!=" , ""],
            wifi_ip:                   ["string", "!=", ""],
            ethernet_ip:               ["string", "!=", ""],
        };
        var commonSettings = {
            ntp_server:                ["string", "=", ""],
            reboot_time:               ["string", "=", "4:00"], 
            is_reboot_optimized:       ["boolean", "=", true],
            is_lcd_on:                 ["boolean", "=", true],
            smil_content_url:          ["string"],
            adb_enabled:               ["boolean", "=", true],
            player_name:               ["string"],
        }
        var commonProp = {
            "persist.sys.timezone": ["string", "=", "Asia/Taipei"],
            "persist.adb.tcp.port": ["string"],
        }

        var commonData = {
            info: commonInfo,
            settings: commonSettings,
            prop: commonProp,
        };

        // For TD1050
        var TD1050 = commonData;
        TD1050.info.model_id = ["string", "=", "TD-1050"];

        // ...

        var TestingData = {
            common: commonData,
            TD1050: TD1050,
        };
        return TestingData;
    }
})();