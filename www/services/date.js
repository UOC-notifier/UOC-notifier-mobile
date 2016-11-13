angular.module('UOCNotifier')

.factory('$date', function($settings) {

    var self = {},
        todayDate = new Date(),
        today = {
                year: todayDate.getFullYear() - 2000,
                month: todayDate.getMonth() +1,
                day: todayDate.getDate()
            },
        limit = getTodayLimit();

    self.updateSettings = function() {
        limit = getTodayLimit();
    };

    self.getDate = function(date, addYear) {
        date = splitDate(date);

        if (!date) {
            return false;
        }

        if (addYear) {
            return addZero(date.day) + "/" + addZero(date.month) + "/" + addZero(date.year - 2000);
        }
        return addZero(date.day) + "/" + addZero(date.month);
    };

    self.getTime = function(date) {
        if (!date) {
            return false;
        }
        var sp = date.split('T');
        if (sp.length <= 1) {
            return "";
        }
        sp = sp[1].split(':');
        if (sp.length <= 1) {
            return "";
        }
        return sp[0]+":"+sp[1];
    };

    self.getTimeFromNumber = function(number) {
        var mins = number % 100;
        if (mins < 10) {
            mins = mins + '0';
        }
        return Math.floor(number / 100) +':'+ mins;
    };

    self.isToday = function(date) {
        date = splitDate(date);

        if (!date) {
            return false;
        }
        return self.compareDates(date, today) === 0;
    };

    self.isNearDate = function(date) {
        if (!date || !limit || self.isBeforeToday(date)) {
            return false;
        }

        return self.compareDates(date, limit) <= 0;
    };

    self.isBeforeToday = function(date) {
        if (!date || date === true) {
            return true;
        }

        return self.compareDates(date, today) < 0;
    };

    self.compareDates = function(dateA, dateB) {
        dateA = splitDate(dateA);
        dateB = splitDate(dateB);

        if (!dateB || !dateA) {
            return 0;
        }

        if (dateB.year != dateA.year) {
            return dateA.year - dateB.year;
        }

        if (dateB.month != dateA.month) {
            return dateA.month - dateB.month;
        }

        return dateA.day - dateB.day;
    };

    self.formatDate = function(date) {
        var d = new Date(date);
        var year = d.getFullYear() - 2000;
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hour = d.getHours();
        var minute = d.getMinutes();

        return addZero(day) + '/' + addZero(month) + '/' + addZero(year) + ' - ' + hour + ':' + addZero(minute);
    };

    self.getEventDate = function(date) {
        if (!date) {
            return false;
        }
        if (self.isBeforeToday(date)) {
            return true;
        }
        if (self.isToday(date)) {
            return 'TODAY';
        }

        return self.getDate(date);
    };

    function getTodayLimit() {
        var limitDays = $settings.get_today();
        if (limitDays >= 0) {
            var limitDate = new Date(Date.now() + limitDays * 24 * 60 * 60 * 1000);
            return {
                year: limitDate.getFullYear() - 2000,
                month: limitDate.getMonth() + 1,
                day: limitDate.getDate()
            };
        }
        return false;
    }

    function splitDate(date) {
        if (typeof date == "string") {
            if (date == "TODAY") {
                return false;
            }

            var sp = date.split('T');
            if (sp.length == 2) {
                date = sp[0];
            }
            sp = date.split("-");
            if (sp.length >= 2) {
                return {
                    year: parseInt(sp[0], 10) || guessYear(parseInt(sp[1], 10)),
                    month: parseInt(sp[1], 10),
                    day: parseInt(sp[2], 10)
                };
            } else {
                sp = date.split("/");
                if (sp.length >= 2) {
                    return {
                        year: parseInt(sp[2], 10) || guessYear(parseInt(sp[1], 10)),
                        month: parseInt(sp[1], 10),
                        day: parseInt(sp[0], 10)
                    };
                }
            }
            return false;
        }

        if (typeof date == "object") {
            return date;
        }

        return false;
    }

    function guessYear(month) {
        var monthDiff = today.month - month;
        if (monthDiff >= 0) {
            return monthDiff <= 6 ? today.year : today.year + 1;
        } else {
            return monthDiff <= -6 ? today.year - 1 : today.year;
        }
    }

    function addZero(i) {
        return i < 10 ? "0" + i : i;
    }

    self.updateSettings();

    return self;
});