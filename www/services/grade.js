angular.module('UOCNotifier')

.factory('Grade', function($debug, $notifications, $utils, $translate) {

  	/**
     * Constructor, with class name
     */
  	function Grade(title, grade, prov) {
  	  	// Public properties, assigned to the instance ('this')
  	  	this.grade = grade.replace('.', ',');
		this.prov = prov;

		title = title.trim();
		var code = get_code(title);
		if (!code) {
			this.name = title;
			this.pos = 10;
			$debug.error('Grade name not recognized: '+this.name);
		} else {
			this.name = code;
			switch (code) {
				case 'C':
					this.pos = 1;
					break;
				case 'P':
					this.pos = 2;
					break;
				case 'FC':
					this.pos = 3;
					break;
				case 'PS':
					this.pos = 4;
					break;
				case 'PV':
					this.pos = 5;
					break;
				case 'EX':
					this.pos = 6;
					break;
				case 'PF':
					this.pos = 7;
					break;
				case 'FE':
					this.pos = 8;
					break;
				case 'FA':
					this.pos = 9;
					break;
				default:
					this.pos = 10;
					$debug.error('Grade code not recognized: '+this.name);
			}
		}
  	}

	Grade.prototype.get_title = function() {
		// POS 10 is the only not translatable grade name
		return this.pos < 10 ? $translate.instant("__" + this.name + "__") + ' ('+this.name+')' : this.name;
	};

	Grade.prototype.notify = function(acronym) {
		var attribs = {
			grade: this.grade,
			final: this.get_title(),
			class: acronym
		};

		if (this.prov) {
			$notifications.notify('FINAL_GRADE_PROV', attribs);
		} else {
			$notifications.notify('FINAL_GRADE', attribs);
		}
	};

	function get_code(title) {
		if (title.length <= 2 ) {
			return title.toUpperCase();
		}

		title = $utils.get_html_realtext(title);
		title = title.toLowerCase();
		title = title.replace(/[^\w\s]/gi, '');

		switch (title) {
			case 'qualificaci davaluaci continuada':
			case 'calificacin de evaluacin continuada': // Not used
			case 'calificacin final':
				return 'C';
			case 'nota final activitats prctiques':
			case 'nota final de actividades prcticas':
			case 'qualificaci final dactivitats prctiques': // Not used
			case 'calificacin final de actividades prcticas':  // Not used
				return 'P';
		}
		$debug.error("Grade title not found: "+title);
		return false;
	}

    return Grade;
});