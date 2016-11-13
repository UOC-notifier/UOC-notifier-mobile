angular.module('UOCNotifier')

.directive('eventRow', function($utils, $date, $state, $ionicHistory, $classes) {
    return {
        restrict: 'E',
        scope: {
            event: '=',
            task: '=?'
        },
        templateUrl: 'templates/event-row.html',
        link: function(scope, elem, attr) {
            var event = scope.event,
                classroom;

            scope.show = event.is_assignment() || (!event.is_committed() || !event.is_completed());
            scope.name = event.name;

            scope.titleColumnWidth = event.graded ? 85 : 40;

            scope.status = $utils.get_event_state(event);
            scope.icon = $utils.get_event_icon(event);
            scope.iconcolor = $utils.get_event_icon_color(event);

            if (scope.task) {
                if (event.is_assignment() && !event.has_ended()) {
                    classroom = $classes.get_class_by_event(event.eventId);
                    scope.titleColumnWidth = 70;
                    scope.style = "background-color: #" + classroom.color + ";";
                    scope.acronym = classroom.get_acronym();
                } else {
                    scope.show = false;
                }
            }

            scope.gotoEvent = function() {
                var currentView = $ionicHistory.currentView();
                switch (currentView.stateName) {
                    case 'app.main':
                        return;
                    case 'app.classroom':
                        $state.go('app.event', {eventid: event.eventId});
                        break;
                    default:
                        classroom = classroom || $classes.get_class_by_event(event.eventId);
                        $state.go('app.classroom', {code: classroom.code}).then(function() {
                            $state.go('app.event', {eventid: event.eventId});
                        });
                        break;
                }
            };

        }
    };
})