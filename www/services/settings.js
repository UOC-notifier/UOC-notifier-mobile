angular.module('UOCNotifier')

.factory('$settings', function($debug, $storage) {

    var self = {};

    self.get_idp = function(){
        return $storage.get_option_int("idp", false);
    };

    self.save_idp = function(idp) {
        $storage.set_option("idp", idp);
    };

    self.get_today = function() {
        return $storage.get_option_int("today", 6);
    };

    self.save_today = function(today) {
        if (today < 0) {
            today = 0;
        }
        $storage.set_option("today", today);
    };

    //OPTIONS - CRITICAL
    self.get_critical = function() {
        return $storage.get_option_int("critical", 10);
    };

    self.save_critical = function(messages) {
        // Do not allow < 0 messages
        if (messages < 0) {
            messages = 0;
        }
        $storage.set_option("critical", messages);
    };

    //OPTIONS - NOTIFICACIONS
    self.get_notification = function() {
        return $storage.get_option_bool("notification", true);
    };

    self.save_notification = function(notify) {
        $storage.set_option("notification", notify);
    };

    self.get_bgchecking = function() {
        return $storage.get_option_int("bgchecking", 1);
    };

    self.save_bgchecking = function(bgchecking) {
        $storage.set_option("bgchecking", bgchecking);
    };

    //OPTIONS - SHOW AGENDA
    self.get_show_agenda = function() {
        return $storage.get_option_bool("show_agenda", true);
    };

    self.save_show_agenda = function(show) {
        $storage.set_option("show_agenda", show);
    };

    //OPTIONS - SHOW MODULE DATES
    self.get_show_module_dates = function() {
        return $storage.get_option_bool("show_module_dates", true);
    };

    self.save_show_module_dates = function(show) {
        $storage.set_option("show_module_dates", show);
    };

    // Announcements
    self.get_announcements = function() {
        var announcements = $storage.get_option("announcements", false);
        announcements = JSON.parse(announcements);
        return announcements;
    };

    self.save_announcements = function(announcements) {
        announcements = JSON.stringify(announcements);
        $storage.set_option("announcements", announcements);
    };

    // RUNNING - UNREAD MAILS
    self.get_mails_unread = function() {
        return $storage.get_option_int("mails_unread", 0);
    };

    self.save_mails_unread = function(number) {
        $storage.set_option("mails_unread", number);
    };

    self.get_check_mail = function() {
        return self.get_mails_unread() >= 0;
    };

    self.save_check_mail = function(save) {
        if (save) {
            self.save_mails_unread(0);
        } else {
            self.save_mails_unread(-1);
        }
    };

    // RUNNING - LOG
    self.get_debug = function() {
        return $storage.get_option_bool("debug", false);
    };

    $debug.set_debug(self.get_debug());

    return self;
});