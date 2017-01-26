angular.module('UOCNotifier')

.factory('$utils', function($translate) {

    var self = {};

    self.get_url = function(url, ssl) {
        return (ssl ? 'https://' : 'http://') + 'cv.uoc.edu' + url;
    };

    self.get_lang = function() {
        return $translate.proposedLanguage();
    };

    self.get_lang_code = function() {
        switch (self.get_lang()) {
            case 'ca':
                return 'a';
            case 'en':
                return 'c';
            case 'es':
            default:
                return 'b';
        }
    };

    self.get_event_icon = function(evnt) {
        if (evnt.is_assignment()) {
            if (evnt.committed) {
                if (evnt.viewed) {
                    return 'ion-android-done-all';
                }
                return 'ion-android-done';
            }
            if (evnt.completed) {
                return 'ion-android-checkbox-outline';
            }
            if (evnt.has_ended()) {
                return 'ion-close-round';
            }
            return 'ion-ribbon-b';
        }
        if (evnt.is_uoc()) {
            return 'ion-university';
        }
        if (evnt.is_committed()) {
            return 'ion-android-checkbox-outline';
        }
        return 'ion-arrow-right-b';
    };

    self.get_event_icon_color = function(evnt) {
        if (evnt.has_started()) {
            if (evnt.is_committed()) {
                return evnt.has_ended() ? 'balanced' : 'energized';
            } else {
                return 'assertive';
            }
        }
    };

    self.get_event_state = function(evnt) {
        var state = "";
        if (evnt.has_started()) {
            state = evnt.has_ended() ? '' : 'running';
            if (evnt.is_committed()) {
                state += evnt.has_ended() ? ' success' : ' warning';
            } else {
                state += ' danger';
            }
        }
        return state;
    };

    self.uri_data = function(map) {
        var str = "";
        for(var v in map){
            str += v+"="+map[v]+"&";
        }
        return str.slice(0,-1);
    };

    self.utf8_to_b64 = function(str) {
        return window.btoa(decodeURIComponent(encodeURIComponent(str)));
    };

    self.b64_to_utf8 = function(str) {
        try {
            return decodeURIComponent(encodeURIComponent(window.atob(str)));
        } catch(err) {
            return str;
        }
    };

    self.get_html_realtext = function(text) {
        return angular.element('<textarea />').html(text).text();
    };

    self.get_url_attr = function (url, attr) {
        if (url.indexOf(attr) == -1) {
            return false;
        }

        var regexp = attr + "=([^&]+)";
        regexp = new RegExp(regexp);
        var match = url.match(regexp);
        if(match){
            return match[1];
        }
        return false;
    };

    self.empty_url_attr = function (url, attr) {
        var value = self.get_url_attr(url, 's');
        return value ? get_url_withoutattr(url, attr) + '&' + attr + '=' : url;
    };

    function get_url_withoutattr(url, parameter) {
        //prefer to use l.search if you have a location/link object
        url = get_real_url(url);
        var urlparts = url.split('?');
        if (urlparts.length >= 2) {
            var prefix =  encodeURIComponent(parameter) + '=';
            if(url.indexOf(prefix) == -1) {
                return url;
            }

            var pars = urlparts[1].split(/[&;]/g);

            //reverse iteration as may be destructive
            for (var i= pars.length; i-- > 0;) {
                //idiom for string.startsWith
                if (pars[i].lastIndexOf(prefix, 0) !== -1) {
                    pars.splice(i, 1);
                }
            }

            url = urlparts[0] + '?' + pars.join('&');
        }
        return url;
    }

    function get_real_url(url) {
        if(url.indexOf('/') === 0){
            return url;
        } else if (url.indexOf('http://') == -1 && url.indexOf('https://') == -1) {
            return '/' + url;
        }
        return url;
    }

    var ARGUMENT_NAMES = /([^\s,]+)/g;
    self.getParamNames = function(functionName, text) {
        var start = text.indexOf(functionName + '(');
        if (start < 0) {
            return false;
        }
        start += functionName.length + 1;
        var result = text.slice(start, text.indexOf(')', start)).match(ARGUMENT_NAMES);
        if (result === null) {
            return false;
        }
        return result;
    }


    return self;
});