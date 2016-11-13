angular.module('UOCNotifier')

.factory('Resource', function($utils) {

  	/**
     * Constructor, with class name
     */
  	function Resource(title, code) {
  	  	// Public properties, assigned to the instance ('this')
  	  	this.title = title;
		this.code = code;
		this.type = false;
		this.messages =  '-';
		this.all_messages =  '-';
		this.link =  "";
		this.pos = false;
		this.news = false;
  	}

	Resource.prototype.has_message_count = function() {
		if (this.type == "messagelist") {
			if (isNaN(this.messages)) {
				this.messages = 0;
			}
			if (isNaN(this.all_messages)) {
				this.all_messages = 0;
			}
			return true;
		}
		return this.type == "old" && !isNaN(this.all_messages);
	};

	Resource.prototype.has_news = function() {
		return (this.type == "blog" || this.type == "oldblog") && this.news;
	};

	Resource.prototype.set_messages = function(messages, all_messages) {
		messages = parseInt(messages);
		all_messages = parseInt(all_messages);

		if (!isNaN(all_messages) && all_messages >= 0) {
			this.all_messages = all_messages;
		}
		if (!isNaN(messages) &&  messages >= 0) {
			this.messages = Math.max(messages, 0);
		}
		if (!this.all_messages) {
			this.messages = '-';
			this.all_messages = '-';
			return 0;
		}

		if (!isNaN(this.messages) && isNaN(this.all_messages)) {
			this.messages = 0;
			this.all_messages = 0;
		}
	};

	Resource.prototype.set_pos = function(pos) {
		this.pos = pos ? parseInt(pos, 10) : false;
	};

	Resource.prototype.set_link = function(link) {
		var url = $utils.get_url_attr(link, 'redirectUrl');
		link = url ? decodeURIComponent(url) : link;

		link = $utils.empty_url_attr(link, 's');
		this.link = $utils.empty_url_attr(link, 'sessionId');
	};

    return Resource;
});