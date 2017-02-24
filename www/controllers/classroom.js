angular.module('UOCNotifier')

.controller('ClassroomCtrl', function($scope, $stateParams, $state, $classes, $date, $app, $settings, $events, $session, $uoc,
            $translate, $debug) {

    var classroom,
        id = $state.current.name + '/' + $stateParams.code,
        observer = $events.on('classesUpdated', id, function() {
            load_view();
        });

    function load_view() {
        classroom = $classes.search_code($stateParams.code);
        $scope.classroom = classroom;
        $scope.title = classroom.title;
        $scope.resources = classroom.resources;
        $scope.events = classroom.events;
        $scope.grades = classroom.grades;
        angular.forEach($scope.grades, function(grade) {
            grade.stats = classroom.get_grade_stats(grade.name);
        });
        $scope.state.session = !!$session.get();

        if (classroom.consultorlastviewed) {
            $scope.consultorlastviewed = classroom.consultorlastviewed;
            $scope.consultorlastviewtranslate =  {
                date: $date.getDate(classroom.consultorlastviewed),
                time: $date.getTime(classroom.consultorlastviewed)
            };
        }

        // Final tests
        if (classroom.exams && classroom.exams.date && $date.isNearDate(classroom.exams.date)) {
            $scope.exams = classroom.exams;
            $scope.exams.typeEX = $translate.instant('__EX__');
            $scope.exams.typePS = $translate.instant('__PS__');
        }

        $scope.showEvents = false;
        for (var x in classroom.events) {
            var event = classroom.events[x];
            $scope.showEvents = event.is_assignment() || (!event.is_committed() || !event.is_completed());
            if ($scope.showEvents) {
                break;
            }
        }

        $debug.log(classroom);
    }

    load_view();

    $scope.openClassroom = function() {
        var link = '/webapps/aulaca/classroom/Classroom.action',
            data = {
                classroomId: classroom.domain,
                subjectId: classroom.domainassig
            };
        $app.open_in_app(link, data, false, 'classroom', classroom);
    };

    $scope.openResource = function(resource) {
        var promise;
        if (resource.link) {
            $app.open_in_app(resource.link, {}, true, 'resource', {resource: resource, classroom: classroom});
        } else {
            $app.open_in_app('/webapps/bustiaca/listMails.do', {l: resource.code}, true, 'resource', {resource: resource, classroom: classroom});
        }
    };

    $scope.gotoUsers = function() {
        $state.go('app.users', {code: classroom.code});
    };

    $scope.gotoMaterials = function() {
        $uoc.retrieve_materials(classroom).then(function(materials) {
            if (materials.length > 0) {
                $state.go('app.materials', {code: classroom.code});
            } else {
                var link = '/webapps/aulaca/classroom/Materials.action',
                    data = {
                        classroomId: classroom.domain,
                        subjectId: classroom.domainassig
                    };
                $app.open_in_app(link, data);
            }
        });
    };

    $scope.gotoStats = function(grade) {
        if (classroom.get_grade_stats(grade)) {
            $state.go('app.stats', {code: classroom.code, grade: grade});
        }
    };

    $scope.openTeachingPlan = function() {
        var link = '/webapps/classroom/download.do',
            data = {
                nav: 'pladocent',
                domainId: classroom.domain,
                format: 'html',
                app: 'aulaca',
                precarrega: false
            };
        $app.open_in_app(link, data);
    };

    $scope.openExams = function() {
        $app.open_in_app('/tren/trenacc/webapp/GEPAF.FULLPERSONAL/index.jsp?s=');
    };

    $scope.openMail = function() {
        var link = '/WebMail/writeMail.do',
            data = {to: classroom.consultormail};
        $app.open_in_app(link, data);
    };

    $scope.openGrades = function() {
        var link = '/webapps/rac/listEstudiant.action',
            data = { domainId: classroom.domain };
        $app.open_in_app(link, data, true);
    };

    $scope.$on('$destroy', function(){
        observer && observer.off && observer.off();
    });
});
