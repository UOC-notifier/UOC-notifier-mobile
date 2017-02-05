angular.module('UOCNotifier')

.factory('$bgservice', function($translate) {

    var self = {},
        bgService = false,
        init = false;

    self.init = function() {
        if (init) {
            return;
        }

        if (!bgService && window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
            bgService = window.cordova.plugins.backgroundMode;
            bgService.setDefaults({
                text: $translate.instant('__BG_TICKER__'),
                title: $translate.instant('TITLE'),
                ticker: $translate.instant('__BG_TICKER__'),
                color: "#FFFFFF",
                icon: "icon",
                isPublic: true,
                resume: true
            });
        }
    };

    // Set background service.
    self.set_background = function(enable) {
        if (bgService) {
            if (enable) {
                bgService.enable();
            } else {
                bgService.disable();
            }
        }
    };

    return self;
});