angular.module('UOCNotifier')

.factory('$classes', function($storage, $debug, $notifications, $events, Classroom, Resource, CalEvent) {

    var self = {
    		messages: 0,
			notified_messages: 0
    		},
    	classes = {},
    	events = {};

    self.add_class = function(classr) {
		if (typeof classes[classr.code] !== 'undefined') {
			classr.notify = classes[classr.code].notify;
		}
		classes[classr.code] = classr;
	};

	self.add_event = function(evnt) {
		// Do not add past events
		if (evnt.has_ended() || typeof evnt.eventId === 'undefined') {
			return;
		}
		if (typeof events[evnt.eventId] !== 'undefined') {
			events[evnt.eventId].name = evnt.name;
			events[evnt.eventId].eventId = evnt.eventId;
			if (evnt.type)  events[evnt.eventId].type = evnt.type;
			if (evnt.start) events[evnt.eventId].start = evnt.start;
			return;
		}
		events[evnt.eventId] = evnt;
	};

	self.get_general_events = function() {
		return events;
	};

	self.reset = function() {
		$storage.unset_option("classes");
		classes = {};
		events = {};
		self.messages = 0;
		self.notified_messages = 0;
	};

	self.save = function(refresh) {
		self.count_messages();
		$notifications.set_messages(self.notified_messages);
		/*classes.sort(function(a, b) {
			if (a.subject_code && !b.subject_code) {
				return -1;
			} else if(b.subject_code && !a.subject_code) {
				return 1;
			}

			if(a.any > b.any) return -1;
		    if(a.any < b.any) return 1;

			if (a.type != b.type) {
				if (a.type == 'TUTORIA') {
					return 1;
				}
				if (b.type == 'TUTORIA') {
					return -1;
				}
			}
			if(a.title < b.title) return -1;
		    if(a.title > b.title) return 1;
		    return 0;
		});*/

		for (var i in classes) {
			if (classes[i].notify) {
				classes[i].sort_things();
			}
		}

		$debug.print(classes);
		$debug.print(events);
		$storage.set_object("classes", classes);
		$storage.set_object("events", events);
		$events.trigger('classesUpdated', refresh);
	};

	self.search = function(field, value) {
		if (field == 'code') {
			return classes[value] || false;
		}

		for (var i in classes) {
			if (classes[i][field] == value) {
				return classes[i];
			}
		}
		return false;
	};

	self.get_class_by_event = function(eventid) {
		for (var i in classes) {
			if (classes[i].notify) {
				if (classes[i].get_event_idx(eventid) >= 0) {
					return classes[i];
				}
			}
		}
		return false;
	};

	self.get_class_by_acronym = function(acronym) {
		for (var i in classes) {
			if (classes[i].notify) {
				if (classes[i].get_acronym() == acronym) {
					return classes[i];
				}
			}
		}
		return false;
	};

	self.get_max_any = function() {
		var max_any = 0;
		for (var x in classes) {
			if (classes[x].any && parseInt(classes[x].any) > max_any) {
				max_any = parseInt(classes[x].any);
			}
		}
		return max_any;
	};

	self.purge_old = function() {
		var max_any = self.get_max_any();
		if (max_any > 0) {
			for (var x in classes) {
				if (classes[x].any && parseInt(classes[x].any) < max_any) {
					classes.splice(x, 1);
				}
			}
		}
	};

	self.purge_all = function() {
		classes = {};
		self.messages = 0;
		self.notified_messages = 0;
		self.save();
	};

	self.get_notify = function (code) {
		return classes[code] ? classes[code].notify : false;
	};

	self.set_notify = function (code, value) {
		if (classes[code]) {
			classes[code].set_notify(value);
			self.save();
		}
	};

	self.load = function () {
		var classesl = $storage.get_object("classes");
		if (classesl) {
			classes = {};
			self.messages = 0;
			self.notified_messages = 0;
			for (var i in classesl) {
				var classl = classesl[i];
				var classr = new Classroom(classl.title, classl.code, classl.domain, classl.type);
				classr.domainassig = classl.domainassig;
				classr.set_color(classl.color);
				classr.any = classl.any;
				classr.aula = classl.aula;
				classr.subject_code = classl.subject_code;
				classr.has_grades = classl.has_grades;
				classr.exped = classl.exped;
				classr.stats = classl.stats;
				classr.exams = classl.exams;
				classr.consultor = classl.consultor;
				classr.consultormail = classl.consultormail;
				classr.consultorlastviewed = classl.consultorlastviewed;
				classr.set_notify(classl.notify);
				if (classl.notify) {
					classr.final_grades = classl.final_grades;
					for (var j in classl.resources) {
						var resourcel = classl.resources[j];
						var resource = new Resource(resourcel.title, resourcel.code);
						resource.set_messages(resourcel.messages, resourcel.all_messages);
						resource.set_pos(resourcel.pos);
						resource.set_link(resourcel.link);
						resource.type = resourcel.type;
						resource.news = resourcel.news;
						classr.add_resource(resource);
					}
					for (var k in classl.events) {
						var evl = classl.events[k];
						var ev = new CalEvent(evl.name, evl.eventId, evl.type);
						ev.start = evl.start;
						ev.end = evl.end;
						ev.grading = evl.grading;
						ev.solution = evl.solution;
						ev.link = evl.link;
						ev.graded = evl.graded;
						ev.committed = evl.committed;
						ev.completed = evl.completed;
						ev.viewed = evl.viewed;
						ev.commenttext = evl.commenttext;
						ev.commentdate = evl.commentdate;
						classr.add_event(ev);
					}
					for (var l in classl.grades) {
						var g = classl.grades[l];
						classr.add_grade(g.name, g.grade, g.prov);
					}
				}
				self.add_class(classr);
			}
			self.count_messages();
		}

		var evnts = $storage.get_object("events");
		if (evnts) {
			events = {};
			for (var m in evnts) {
				var evnt = evnts[m];
				var cevnt = new CalEvent(evnt.name, evnt.eventId, evnt.type);
				cevnt.start = evnt.start;
				self.add_event(cevnt);
			}
		}
	};

	self.get_all = function () {
		return classes;
	};

	self.get_notified = function () {
		var classrooms = [];
		for (var i in classes) {
			if (classes[i].notify) {
				classrooms.push(classes[i]);
			}
		}
		return classrooms;
	};

	self.count_messages = function() {
		var classrooms = self.get_all();
		self.notified_messages = 0;
		self.messages = 0;
		for (var i in classrooms) {
			var messages = classrooms[i].count_messages();
			if (classrooms[i].notify) {
				self.notified_messages += messages;
			}
			self.messages += messages;
		}
	};

	self.is_all_graded = function() {
		for (var i in classes) {
			if (classes[i].notify) {
				if (!classes[i].has_all_grades()) {
					return false;
				}
			}
		}
		return true;
	};

	self.load();

	// DEPRECATED
	self.search_domainassig = function(domain) {
		return search('domainassig', domain);
	};

	// DEPRECATED
	self.search_subject_code = function(subject_code) {
		return search('subject_code', subject_code);
	};

	// DEPRECATED
	self.search_code = function(code) {
		return classes[code] || false;
	};

	// DEPRECATED
	self.get_index = function(code) {
		for (var i in classes) {
			if (classes[i].code == code) {
				return i;
			}
		}
		return false;
	};

	// DEPRECATED
	self.add = function(classr) {
		return self.add_class(classr);
	};

    return self;
});