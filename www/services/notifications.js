angular.module('UOCNotifier')

.factory('$notifications', function($settings, $storage, $cordovaLocalNotification, $cordovaBadge, $debug, $translate) {

    var self = {},
        notificationId = 0;

    self.notify = function(body, translateParams) {
        if (!body) {
            return;
        }

        body = $translate.instant('__' + body + '__', translateParams);

        save_has_news(true);
        if ($settings.get_notification()) {
            $debug.print(body);
            // timeout = timeout == undefined ? 3000 : timeout;
            try {
                $cordovaLocalNotification.schedule({
                    id: notificationId++,
                    title: 'UOC notifier',
                    text: body,
                    icon: 'res://icon'
                });
            } catch(err) {

            }
        }
    };

    function set_badge(number, color) {
        try {
            var oldnumber = $cordovaBadge.get();
            if (oldnumber != number) {
                if (number > 0) {
                    $cordovaBadge.set(number);
                } else {
                    $cordovaBadge.clear();
                }
            }
        } catch(err) {
            $debug.error(err);
        }
    }

    function get_icon() {
        return $storage.get_option_int("messages_icon", 0);
    }

    function save_icon(number) {
        $storage.set_option("messages_icon", number);
    }

    function has_news() {
        return $storage.get_option_bool("hasnews", false);
    }

    function save_has_news(news) {
        $storage.set_option("hasnews", news);
    }

    self.set_messages = function(messages) {
        var color,
            old_messages = get_icon(),
            critical = $settings.get_critical();

        save_icon(messages);

        // Set icon
        if (messages > 0) {
            if (messages > old_messages && messages >= critical) {
                self.notify('NOTIFICATION_UNREAD', {messages: messages});
            }
            color = messages >= critical ? '#AA0000' : '#EB9316';
        }

        $debug.print("Check messages: Old "+old_messages+" New "+messages);

        var news = has_news();
        if (news) {
            color = '#9E5A9E';
        } else if (messages <= 0) {
            messages = "";
        }

        set_badge(messages, color);
    };

    self.show_PAC_notifications = function(notifiedClasses) {
        for(var i in notifiedClasses) {
            for(var x in notifiedClasses[i].events) {
                var ev = notifiedClasses[i].events[x];
                if (ev.is_assignment()) {
                    if (ev.ends_today()) {
                        self.notify($translate.instant('__PRACT_END__', {pract: ev.name, class: notifiedClasses[i].get_acronym()}));
                    } else if (ev.starts_today()) {
                        self.notify($translate.instant('__PRACT_START__', {pract: ev.name, class: notifiedClasses[i].get_acronym()}));
                    }
                }
            }
        }
    };

    return self;
});