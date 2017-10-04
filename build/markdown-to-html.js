'use strict';

var Remarkable = require('remarkable');
var md = new Remarkable();

module.exports = function markdownToHtml(mardown) {
	return md.render(markdown);
}