function main() {
	chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		if(request.type == 'getOptions') {
			sendResponse({
				keywords: split_mute_keywords(localStorage['mute_keywords']),
				exclude_mute_plurk: split_mute_keywords(localStorage['exclude_mute']),
				show_debug: (localStorage['show_debug'] ? true : false)
			});
		} else if(request.type == 'setOptions') {
			localStorage[request.key] = request.value;
			sendResponse({
				success: 1
			});
		} else if(request.type == 'openOptions') {
			chrome.tabs.create({
				url: "options.html"
			});
		}
	});
}
main();