angular.module('UOCNotifier')

.controller('StatsCtrl', function($scope, $stateParams, $classes, $uoc) {
    var classroom = $classes.search_code($stateParams.code),
        grade = $stateParams.grade;

    $scope.title = classroom.title;
    $scope.grade = grade;

    if (grade == "C" || grade == "P") {
        $scope.charts = classroom.get_grade_stats(grade);
        $scope.chartColors = ['#79C753', '#FDB45C', '#FF8000', '#F7786B', '#DD4132', '#DCDCDC'];
    } else if (grade == "FA") {
        $scope.charts = [{
            values: classroom.get_grade_stats(grade),
            labels: ['M', 'EX', 'NO', 'A', 'SU']
        }];
        $scope.chartColors = ['#79C753', '#FDB45C', '#FF8000', '#F7786B', '#DD4132'];
    }
});
