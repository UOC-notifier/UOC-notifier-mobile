angular.module('uoc-notifier')

.directive('eventdate', function() {
    return {
        restrict: 'E',
        scope: {
            date: '=?',
            graded: '=?'
        },
        templateUrl: 'templates/eventdate.html',
        link: function(scope, elem, attr) {
            var today_limit = get_today_limit();
            scope.near = isNearDate(scope.date, today_limit);
        }
    };
})

.directive('eventgrade', function() {
    return {
        restrict: 'E',
        scope: {
            date: '=?',
            graded: '=?',
            comment: '=?'
        },
        templateUrl: 'templates/eventgrade.html',
        link: function(scope, elem, attr) {
            var today_limit = get_today_limit();
            scope.near = isNearDate(scope.date, today_limit);
        }
    };
})

.directive('resource', function() {
    return {
        restrict: 'E',
        scope: {
            title: '=',
            messages: '=?',
            allmessages: '=?',
            hasmessagecount: '=?',
            hasnews: '=?',
            action: '&?'
        },
        templateUrl: 'templates/resource.html',
        link: function(scope, elem, attr) {
            if (scope.hasmessagecount) {
                scope.critical = get_critical();
            }
        }
    };
});
