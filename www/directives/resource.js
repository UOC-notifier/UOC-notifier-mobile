angular.module('UOCNotifier')

.directive('resource', function($settings) {
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
                scope.critical = $settings.get_critical();
            }
        }
    };
});
