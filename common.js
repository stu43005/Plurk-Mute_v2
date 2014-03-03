//split_mute_keywords(localStorage['mute_keywords'])


function split_mute_keywords(s) {
	var a = new Array();
	if(s) {
		try {
			a = JSON.parse(s);
		} catch(e) {
			a = s.split(/\s*,\s*/);
		}
	}
	return a;
}

function htmlspecialchars(string) {
	string = string.toString();
	string = string.replace('&', "&amp;");
	string = string.replace('"', "&quot;");
	string = string.replace("'", "&#039;");
	string = string.replace('<', "&lt;");
	string = string.replace('>', "&gt;");
	return string;
}