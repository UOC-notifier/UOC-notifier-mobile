angular.module('UOCNotifier')

.factory('CalEvent', function($notifications, $date) {

  	/**
     * Constructor, with class name
     */
  	function CalEvent(name, id, type) {
		this.name = name;
		this.start = false;
		this.end = false;
		this.grading = false;
		this.solution = false;
		this.graded = false;
		this.committed = false;
		this.completed = false;
		this.viewed = false;
		this.commenttext = false;
		this.commentdate = false;
		this.link = "";
		this.eventId = id;
		this.type = type;
  	}

	CalEvent.prototype.has_started = function() {
		return this.start ? $date.isBeforeToday(this.start) || $date.isToday(this.start) : true;
	};

	CalEvent.prototype.has_ended = function() {
		return $date.isBeforeToday(this.end ? this.end : this.start);
	};

	CalEvent.prototype.starts_today = function() {
		return this.start && this.end ? $date.isToday(this.start) : false;
	};

	CalEvent.prototype.ends_today = function() {
		return $date.isToday(this.end ? this.end : this.start);
	};

	CalEvent.prototype.is_near = function() {
		return (this.has_started() && !this.has_ended()) || $date.isNearDate(this.start) ||
			$date.isNearDate(this.grading) || $date.isNearDate(this.solution);
	};

	CalEvent.prototype.is_assignment = function() {
		return (this.type == 'ASSIGNMENT' || typeof this.type == 'undefined');
	};

	CalEvent.prototype.is_uoc = function() {
		return this.type == 'UOC';
	};

	CalEvent.prototype.is_completed = function() {
		return $date.isBeforeToday(this.start) && $date.isBeforeToday(this.end) && $date.isBeforeToday(this.solution) &&
			$date.isBeforeToday(this.grading);
	};

	CalEvent.prototype.is_committed = function() {
		return this.committed || this.completed;
	};

	CalEvent.prototype.notify = function(acronym) {
		$notifications.notify('PRACT_GRADE', {grade: this.graded, pract: this.name, class: acronym});
	};

    return CalEvent;
});