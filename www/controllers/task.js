angular.module('UOCNotifier')

.controller('TasksCtrl', function($scope, $classes, $date, $events, $state) {

    var observer = $events.on('classesUpdated', $state.current.name, function() {
        load_view();
    });

    function load_view() {
        var classes = $classes.get_notified();
        $scope.assignments = [];

        for (var y in classes) {
            var classroom = classes[y];
            for (var x in classroom.events) {
                var evnt = classroom.events[x];
                if (evnt.is_assignment() && !evnt.has_ended()) {
                    $scope.assignments.push(evnt);
                }
            }
        }

        $scope.assignments.sort(function(a, b) {
            if (a.has_started() && b.has_started()) {
                return $date.compareDates(a.end, b.end);
            }
            return $date.compareDates(a.start, b.start);
        });
    }

    load_view();

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
    });
});
