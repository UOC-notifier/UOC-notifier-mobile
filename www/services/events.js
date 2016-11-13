angular.module('UOCNotifier')

.factory('$events', function($debug) {

    var self = {},
        observers = {};

    self.on = function(eventName, observerID, callBack) {

        if (typeof(observers[eventName]) === 'undefined') {
            observers[eventName] = {};
        }

        observers[eventName][observerID] = callBack;
        return {
            id: observerID,
            off: function() {
                delete observers[eventName][observerID];
            }
        };
    };

    self.getObserverId = function(state) {
        return state.stateName;
    };

    self.trigger = function(eventName, data) {
        var affected = observers[eventName];
        for (var observerName in affected) {
            if (typeof(affected[observerName]) === 'function') {
                $debug.print("Triggered " + eventName + " on " + observerName);
                affected[observerName](data);
            }
        }
    };

    return self;
});
