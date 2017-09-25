angular.module('UOCNotifier')

.controller('LinksCtrl', function($scope, $state, $classes, $app, $settings, $utils) {
    $scope.gotoTool = function(link, nossl) {
        var url;
        if (link[0] == '/') {
            url = link;
        } else {
            url = '/tren/trenacc?modul=GAT_EXP.' + link;
            nossl = false;
        }
        $app.open_in_app(url, null, nossl);
    };

    $scope.gotoFiles = function() {
        var url = '/webapps/filearea/servlet/iuoc.fileserver.servlets.FAGateway?opId=getMainFS&company=/UOC&idLang=/'+$utils.get_lang_code()+'&sessionId=';
        $app.open_in_app(url, false, true);
    };
});
