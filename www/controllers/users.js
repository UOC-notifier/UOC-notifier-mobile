angular.module('UOCNotifier')

.controller('UsersCtrl', function($scope, $stateParams, $app, $classes, $uoc, $date, $ionicLoading) {

    var classroom;
    $scope.loaded = false;

    function load_view() {
        classroom = $classes.search_code($stateParams.code);
        $scope.acronym = classroom.get_acronym();
        return $uoc.retrieve_users(classroom).then(function(users) {
            $scope.users = users.map(function(user) {
                if (user.lastLoginTime) {
                    user.lastviewtranslate =  {
                        date: $date.getDate(user.lastLoginTime),
                        time: $date.getTime(user.lastLoginTime)
                    };
                }
                return user;
            });
            $scope.loaded = true;
        });
    }

    $ionicLoading.show({
      template: '<ion-spinner></ion-spinner>',
    });

    load_view().then(function() {
        $ionicLoading.hide();
    });

    $scope.mailUser = function(mail) {
        var link = '/WebMail/writeMail.do',
            data = {to: mail};
        $app.open_in_app(link, data);
    };
});
