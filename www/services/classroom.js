angular.module('UOCNotifier')

.factory('Classroom', function($debug, $date, Grade) {

	/**
     * Constructor, with class name
     */
  	function Classroom(title, code, domain, type) {
  	  	// Public properties, assigned to the instance ('this')
  	  	this.title = title;
		this.code = code;
		this.domain = domain;
		this.domainassig = domain;
		this.type = type;
		this.subject_code = false;
		this.has_grades = false;
		this.exped = false;
		this.color = false;
		this.any = false;
		this.aula = false;
		this.stats = false;
		this.final_grades = false;
		this.consultor = false;
		this.consultormail = false;
		this.consultorlastviewed = false;
		this.acronym = false;

		this.notify = true;
		this.messages = 0;
		this.resources = [];
		this.events = [];
		this.grades = [];
		this.exams = false;
  	}

	Classroom.prototype.set_color = function(color) {
		if (color && color != 'undefined' && color != 'false') {
			this.color = color;
		}
	};

	Classroom.prototype.get_acronym = function() {
		if (!this.acronym) {
			this.set_acronym();
		}
		return this.acronym;
	};

	Classroom.prototype.set_acronym = function() {
		this.acronym =  this.type == 'TUTORIA' ? 'TUT' + this.aula : construct_acronym(this.title);
	};

	Classroom.prototype.set_notify = function(notify) {
		this.notify = notify;
	};

	// Adds a final grade returning if it changed
	Classroom.prototype.add_grade = function(name, grade, prov) {
		var g = new Grade(name, grade, prov);

		// Stop notifying warning FE grades if EX is not present
		if (g.grade == 'D 2' && g.name == 'FE' && g.prov) {
			var exfound = this.get_grade_index('EX');
			if (exfound === false) {
				$debug.print('Provisional Grade D 2 of FE detected without EX');
				return false;
			}
		}

		var i = this.get_grade_index(g.name);
		if (i === false) {
			this.grades.push(g);
			return g;
		}

		if (!this.grades[i].prov && prov) {
			// Change to not provisional not allowed
			return false;
		}

		if (this.grades[i].grade != g.grade || (!prov && this.grades[i].prov)) {
			this.grades[i].grade = g.grade;
			if (!prov) {
				// Only change when it becomes def
				this.grades[i].prov = false;
			}
			return this.grades[i];
		}
		return false;
	};

	Classroom.prototype.get_grade_index = function(name) {
		for (var i in this.grades) {
			if (this.grades[i].name == name) {
				return i;
			}
		}
		return false;
	};

	Classroom.prototype.add_resource = function(resource) {
		if(!this.notify) return;

		var idx = this.get_index(resource.code);
		if (idx >= 0) {
			this.resource_merge(idx, resource);
			return this.resources[idx];
		} else {
			this.resources.push(resource);
			if (resource.messages != '-') {
				this.messages += resource.messages;
			}
			return resource;
		}
	};

	Classroom.prototype.sort_things = function() {
		this.resources.sort(function(a, b) {
			if(a.has_message_count() != b.has_message_count()) {
				if (a.has_message_count()) {
					return -1;
				}
				return 1;
			}

			if (isNaN(b.pos)) {
				return -1;
			}
			if(a.pos < b.pos) return -1;
		    if(a.pos > b.pos) return 1;

			if(a.title < b.title) return -1;
		    if(a.title > b.title) return 1;
		    return 0;
		});

		this.grades.sort(function(a, b) {
			if(a.pos < b.pos) return -1;
		    if(a.pos > b.pos) return 1;

			if(a.name < b.name) return -1;
		    if(a.name > b.name) return 1;
		    return 0;
		});

		this.events.sort(function(a, b) {
			var comp = $date.compareDates(a.start, b.start);
			if (comp === 0) {
				return $date.compareDates(a.end, b.end);
			}
			return comp;
		});
	};

	Classroom.prototype.count_messages = function() {
		this.messages = 0;
		for (var i in this.resources) {
			if(this.resources[i].messages != '-') {
				this.messages += this.resources[i].messages;
			}
		}
		return this.messages;
	};

	Classroom.prototype.get_index = function(code) {
		for (var i in this.resources) {
			if(this.resources[i].code == code) {
				return i;
			}
		}
		return -1;
	};

	Classroom.prototype.resource_merge = function(idx, resource) {
		this.resources[idx].set_messages(resource.messages, resource.all_messages);
		this.resources[idx].set_pos(resource.pos);
		this.resources[idx].link = resource.link;
		this.resources[idx].code = resource.code;
		this.resources[idx].title = resource.title;
		this.resources[idx].type = resource.type || this.resources[idx].type;
		this.resources[idx].news = resource.news || this.resources[idx].news;
	};

	Classroom.prototype.delete_old_resources = function() {
		$debug.log('Delete old resources for '+this.acronym);
		for (var i in this.resources) {
			if (this.resources[i].type == 'old' || this.resources[i].type == 'oldblog') {
				this.resources.splice(i, 1);
			}
		}
	};

	Classroom.prototype.add_event = function(ev) {
		if (typeof ev.eventId == 'undefined') {
			return;
		}

		var idx = this.get_event_idx(ev.eventId);
		if (idx >= 0) {
			this.event_merge(idx, ev);
		} else {
			this.events.push(ev);
		}
	};

	Classroom.prototype.get_event = function(id) {
		var idx = this.get_event_idx(id);
		if (idx >= 0) {
			return this.events[idx];
		}
		return false;
	};

	Classroom.prototype.get_event_idx = function(id) {
		for (var i in this.events) {
			if(this.events[i].eventId == id) {
				return i;
			}
		}
		return -1;
	};

	Classroom.prototype.has_events = function() {
		return this.events.length > 0;
	};

	Classroom.prototype.has_all_grades = function() {
		if (this.final_grades){
			return true;
		}
		if (!this.has_events()) {
			return true;
		}
		for (var i in this.events) {
			if (this.events[i].is_assignment()) {
				if (!this.events[i].is_completed() || !this.events[i].graded) {
					return false;
				}
			}
		}
		return true;
	};

	Classroom.prototype.all_events_completed = function(only_assignments) {
		for (var i in this.events) {
			if (!only_assignments || this.events[i].is_assignment()) {
				if (!this.events[i].is_completed()) {
					return false;
				}
			}
		}
		return true;
	};

	Classroom.prototype.event_merge = function(idx, ev) {
		this.events[idx].name = ev.name;
		this.events[idx].eventId = ev.eventId;
		if (ev.type)  this.events[idx].type = ev.type;
		if (ev.link) this.events[idx].link = ev.link;
		if (ev.start) this.events[idx].start = ev.start;
		if (ev.end) this.events[idx].end = ev.end;
		if (ev.grading) this.events[idx].grading = ev.grading;
		if (ev.solution) this.events[idx].solution = ev.solution;
		if (ev.graded) this.events[idx].graded = ev.graded;
		if (ev.committed) this.events[idx].committed = ev.committed;
		if (ev.completed) this.events[idx].completed = ev.completed;
		if (ev.viewed) this.events[idx].viewed = ev.viewed;
		if (ev.commenttext) this.events[idx].commenttext = ev.commenttext;
		if (ev.commentdate) this.events[idx].commentdate = ev.commentdate;
	};

	function construct_acronym(text) {
	    if (typeof text == 'undefined') {
	        return "";
	    }

	    var words = text.split(/[\s, '´:\(\)\-]+/);
	    var acronym = "";
	    var nowords = ['amb', 'con', 'de', 'a', 'per', 'para', 'en', 'la', 'el', 'y', 'i', 'les', 'las', 'l', 'd'];
	    for (var x in words) {
	        if (nowords.indexOf(words[x].toLowerCase()) < 0) {
	            if (words[x] == words[x].toUpperCase()) {
	                switch(words[x]) {
	                    case 'I':
	                        acronym += '1';
	                        break;
	                    case 'II':
	                        acronym += '2';
	                        break;
	                    case 'III':
	                        acronym += '3';
	                        break;
	                    case 'IV':
	                        acronym += '4';
	                        break;
	                    case 'V':
	                        acronym += '5';
	                        break;
	                    default:
	                        acronym += words[x];
	                }
	            } else {
	                acronym += words[x].charAt(0);
	            }
	        } else {
	            if (words[x] == 'I') {
	                acronym += 1;
	            }
	        }
	    }
	    return acronym.toUpperCase();
	}

    return Classroom;
});