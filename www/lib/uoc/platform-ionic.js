function setBadge(number, color) {

}

function popup_notification(title, icon, body, timeout) {

}

function open_new_tab(url) {

}

function translate(str, params){

}

function get_version() {

}

function reset_alarm() {

}

function get_event_text(date) {
    if (isBeforeToday(date)) {
        return true;
    }
    if (isToday(date)) {
        return _('__TODAY__');
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
        return'ion-university';
    }
    return 'ion-arrow-right-b';
}

function get_event_icon_color(evnt) {
    if (evnt.is_assignment() && !evnt.committed && evnt.has_ended()) {
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