angular.module('UOCNotifier')

.controller('MaterialsCtrl', function($scope, $stateParams, $app, $classes, $uoc, $ionicLoading, $session) {

    var classroom;
    $scope.loaded = false;

    function load_view() {
        $scope.state.session = !!$session.get();
        classroom = $classes.search_code($stateParams.code);
        $scope.acronym = classroom.get_acronym();
        $scope.classroomColor = classroom.color;
        return $uoc.retrieve_materials(classroom).then(function(materials) {
            $scope.materials = materials.materials;
            $scope.other = materials.other;
            $scope.loaded = true;
        });
    }

    $ionicLoading.show({
      template: '<ion-spinner></ion-spinner>',
    });

    load_view().then(function() {
        $ionicLoading.hide();
    });

    $scope.openMaterial = function(url) {
        $app.open_in_browser(url);
    };

    $scope.openMaterials = function() {
        var link = '/webapps/aulaca/classroom/Materials.action',
            data = {
                classroomId: classroom.domain,
                subjectId: classroom.domainassig
            };
        $app.open_in_browser(link, data);
    };
});
