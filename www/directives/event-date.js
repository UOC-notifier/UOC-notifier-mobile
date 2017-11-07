angular.module('UOCNotifier')

.directive('eventDate', function($date) {
    return {
        restrict: 'E',
        scope: {
            date: '=?',
            isGrades: '=?',
            comment: '=?',
            hasStats: '=?',
            graded: '=?'
        },
        templateUrl: 'templates/event-date.html',
        link: function(scope) {
            var date = scope.date;

            if (!date && !scope.graded && !scope.comment && !scope.hasStats) {
                scope.show = false;
                return;
            }

            scope.hasPassed = $date.isBeforeToday(date);
            scope.isToday = $date.isToday(date);
            scope.isNear = $date.isNearDate(date);
            scope.dateFormatted = $date.getDate(date);

            scope.show = scope.isGrades || !scope.hasPassed || !scope.graded;
        }
    };
})