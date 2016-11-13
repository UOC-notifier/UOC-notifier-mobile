angular.module('UOCNotifier')

.factory('$settings', function($debug, $storage) {

    var self = {};

    self.get_idp = function(){
        return $storage.get_option_int("idp", false);
    };

    self.save_idp = function(idp) {
        $storage.set_option("idp", idp);
    };

    // OPTIONS - UNIVERSITY
    self.get_uni = function() {
        return $storage.get_option("uni", 'UOCc');
    };

    self.get_gat = function() {
        var uni =  self.get_uni();
        if (uni == 'UOCi') {
            return 'GAT_EXPIB';
        }
        return 'GAT_EXP';
    };

    self.save_uni = function(uni) {
        $storage.set_option("uni",uni);
    };

    self.get_lang = function() {
        var uni =  self.get_uni();
        if(uni == 'UOCi') {
            return 'es';
        }
        return 'ca';
    };

    self.get_lang_code = function() {
        var uni =  self.get_uni();
        if(uni == 'UOCi') {
            return 'b';
        }
        return 'a';
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


    // OPTIONS - CHECK INTERVAL
    self.get_interval = function() {
        return $storage.get_option_int("check_interval", 20);
    };

    self.save_interval = function(minutes) {
        // Do not allow < 5 intervals to not saturate.
        if (minutes < 5 && minutes !== 0) {
            minutes = 5;
        }
        $storage.set_option("check_interval", minutes);
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