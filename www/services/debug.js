angular.module('UOCNotifier')

.factory('$debug', function() {

    var self = {},
        show = false;

    self.log = function(message) {
        if (show) {
            console.debug(message);
        }
    };

    self.print = function(message) {
        console.log(message);
    };

    self.error = function(message) {
        console.error(message);
    };

    self.set_debug = function(value) {
        show = value;
    };

    return self;
});