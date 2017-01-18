angular.module('UOCNotifier')

.controller('EventCtrl', function($scope, $stateParams, $state, $classes, $date, $app, $utils, $events, $session, $translate) {

    var classroom, event,
        id = $state.current.name + '/' + $stateParams.eventid,
        observer = $events.on('classesUpdated', id, function() {
            load_view();
        });

    function load_view() {
        $scope.state.session = !!$session.get();

        classroom = $classes.get_class_by_event($stateParams.eventid);
        $scope.acronym = classroom.get_acronym();
        $scope.classroomColor = classroom.color;

        event = classroom.get_event($stateParams.eventid);

        $scope.event = event;

        $scope.start = event.start ? $date.getEventDate(event.start) : false;
        $scope.end = event.end ? $date.getEventDate(event.end) : false;
        $scope.solution = event.solution ? $date.getEventDate(event.solution) : false;
        $scope.grade = event.grading ? $date.getEventDate(event.grading) : false;
        if (event.commentdate) {
            $scope.commentdate =  {
                date: $date.getDate(event.commentdate),
                time: $date.getTime(event.commentdate)
            };
        }
        $scope.commenttext = $utils.get_html_realtext(event.commenttext);

        if (event.is_assignment()) {
            if (event.committed) {
                if (event.viewed) {
                    $scope.status = '__COMMITTED_VIEWED__';
                    $scope.statusparams =  {
                        date: $date.getDate(event.viewed),
                        time: $date.getTime(event.viewed)
                    };
                } else {
                    $scope.status = '__COMMITTED__';
                }
            } else if (event.completed) {
                $scope.status = '__COMPLETED__';
            } else if(event.has_ended()) {
                $scope.status = '__NOT_COMMITTED__';
            }
        } else if (event.is_committed()) {
            $scope.status = '__COMPLETED__';
        }
        $scope.typetext = $translate.instant("__" + event.type + "__");

        $scope.icon = $utils.get_event_icon(event);
        $scope.iconcolor = $utils.get_event_icon_color(event);
    }

    load_view()

    $scope.openEvent = function() {
        $app.open_in_app(event.link, null, false, 'classroom', classroom);
    };

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
    });
});
