angular.module('UOCNotifier')

.factory('$storage', function() {

    var self = {};

    self.get_object = function(option_name) {
        var object = self.get_option(option_name, false);
        if (object) {
            return JSON.parse(object);
        }
        return false;
    };

    self.set_object = function(option_name, object) {
        return self.set_option(option_name, JSON.stringify(object));
    };

    // Storage manager
    self.get_option = function(option_name, default_value) {
        return localStorage.getItem(option_name) || default_value;
    };

    self.get_option_bool = function(option_name, default_value) {
        var value = localStorage.getItem(option_name);
        if (typeof value == 'undefined' || value === null) {
            return default_value;
        }
        if (!isNaN(parseInt(value))  && parseInt(value) > 0) {
            return true;
        }
        return value == "true";
    };

    self.get_option_int = function(option_name, default_value) {
        var value = self.get_option(option_name, default_value);
        value = parseInt(value);
        if (isNaN(value)) {
            return default_value;
        }
        return value;
    };

    self.set_option = function(option_name, value) {
        localStorage.setItem(option_name, value);
    };

    self.unset_option = function(option_name) {
        localStorage.removeItem(option_name);
    };

    return self;
});