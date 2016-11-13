angular.module('UOCNotifier')

.controller('LinksCtrl', function($scope, $state, $classes, $app, $settings) {
    $scope.gotoTool = function(link, nossl) {
        var url;
        if (link[0] == '/') {
            url = link;
        } else {
            var gat =  $settings.get_gat();
            url = '/tren/trenacc?modul='+gat+link;
            nossl = false;
        }
        $app.open_in_app(url, null, nossl);
    };

    $scope.gotoOldAgenda = function() {
        var domainId = "";
        var classrooms = $classes.get_notified();
        for(var i in classrooms){
            if (classrooms[i].domain) {
            domainId = "&domainId=" + classrooms[i].domain;
            break;
            }
        }
        var url = '/webapps/classroom/081_common/jsp/calendari_semestral.jsp?appId=UOC&idLang=a&assignment=ESTUDIANT&domainPontCode=sem_pont'+domainId+'&s=';
        $app.open_in_app(url);
    };

    $scope.gotoFiles = function() {
        var url = '/webapps/filearea/servlet/iuoc.fileserver.servlets.FAGateway?opId=getMainFS&company=/UOC&idLang=/'+$settings.get_lang_code()+'&sessionId=';
        $app.open_in_app(url);
    };
});
