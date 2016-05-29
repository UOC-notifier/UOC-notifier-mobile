var notification_handler;
var badge_handler;
var translate_handler;
var interval_run = false;

function setBadge(number, color) {
    if (badge_handler) {
        badge_handler(number, color);
    }
}

function popup_notification(title, icon, body, timeout) {
    if (notification_handler) {
        notification_handler(body, timeout);
    }
}

function open_new_tab(url) {

}

function translate(str, params){
    if (translate_handler) {
        return translate_handler(str, params);
    }
}

function get_version() {

}

function reset_alarm() {
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.backgroundMode) {
        var interval = get_interval();
        if (interval > 0) {
            cordova.plugins.backgroundMode.enable();
            //cordova.plugins.backgroundMode.configure({silent: true});
            cordova.plugins.backgroundMode.onactivate = function() {
                popup_notification(false, false, 'ENABLED');
                var interval = get_interval();
                interval_run = setTimeout(onAlarm, interval * 3000);
            };

            cordova.plugins.backgroundMode.ondeactivate = function() {
                popup_notification(false, false, 'STOP WORKING');
                clearTimeout(interval_run);
            };
        } else {
            popup_notification(false, false, 'INTERVAL DISABLED ' + interval);
            cordova.plugins.backgroundMode.disable();
            clearTimeout(interval_run);
        }
    }
}

function onAlarm() {
    popup_notification(false, false, 'WORKING');
    if (!Queue.is_running()) {
        var user = get_user();
        if (!user.username || !user.password) {
            return;
        }
        popup_notification(false, false, 'Refresh');
        check_messages();
    }
}

function get_event_text(date, limit) {
    if (!date) {
        return false;
    }
    if (isBeforeToday(date)) {
        return true;
    }
    if (isToday(date)) {
        return 'TODAY';
    }
    var dsplit = date.split('/');
    return dsplit[0]+'/'+dsplit[1];
}

function get_event_icon(evnt) {
    if (evnt.is_assignment()) {
        if (evnt.committed) {
            if (evnt.viewed) {
                return 'ion-android-done-all';
            }
            return 'ion-android-done';
        }
        if (evnt.has_ended()) {
            return 'ion-close-round';
        }
        return 'ion-ribbon-b';
    }
    if (evnt.is_uoc()) {
        return 'ion-university';
    }
    return 'ion-arrow-right-b';
}

function get_event_icon_color(evnt) {
    if (evnt.is_assignment() && !evnt.committed && evnt.has_started() && !evnt.has_ended()) {
        return 'assertive';
    }
    return 'balanced';
}

function get_event_state(evnt) {
    if (evnt.has_started()) {
        if (evnt.has_ended()) {
            return 'success';
        }
        if (evnt.committed || !evnt.is_assignment()) {
            return'warning running';
        }
        return 'danger running';
    }
    return "";
}