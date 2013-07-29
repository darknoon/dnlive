({ define: typeof define === "function"
	? define  // browser
	: function(F) { F(require,exports,module) } }).  // Node.js
define(function (require, exports, module) {

exports.events = {
	FILE_CREATED: 'c',
	FILE_CHANGED: 'w',
	FILE_DELETED: 'd',
	FILE_RETURN_ALL: 'get_all_return',
};

exports.commands = {
	GET_ALL: 'gfl',
}

// For all events
exports.EVENT = 'e';

// For FILE_* events
exports.FILE_NAME = 'f';
exports.FILE_DATA = 'd';

// For FILE_RETURN_ALL event in response to GET_ALL command
exports.FILES = 'f';


});

