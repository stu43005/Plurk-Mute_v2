var interval = 500;
var user_name = null;
var keywords = new Array();
var exclude_mute_plurk = new Array();
var friend_ids;
var show_debug = false;

function load_keywords() {
	var p1 = new Promise(function(resolve, reject) {
		try {
			chrome.extension.sendRequest({
				type: 'getOptions'
			}, function(response) {
				keywords = response.keywords;
				exclude_mute_plurk = response.exclude_mute_plurk;
				show_debug = response.show_debug;
				resolve(response);
				if (show_debug) console.debug('keywords:', keywords, '\nexclude_mute_plurk:', exclude_mute_plurk);
			});
		} catch (e) {
			reject(e);
			console.error('發生錯誤：', e);
			var c = confirm('無法連線到插件後台，請立即重新整理頁面看看，可能有版本更新，繼續將無法正常操作');
			if (c) window.location.reload();
		}
	});

	var p2 = fetch("/Users/getCompletion", {
		credentials: 'include',
		method: 'POST'
	}).then(r => r.json()).then(json => {
		friend_ids = [];
		for (var c in json) {
			friend_ids.push(c * 1);
		}
		if (show_debug) console.debug("friend_list", friend_ids);
		return friend_ids;
	}).catch(err => {
		setTimeout(load_keywords, 1000);
		console.error("Get friend list failed");
	});

	return Promise.all([p1, p2]);
}

function getusername() {
	if (user_name == null) {
		return getGlobalVariable("GLOBAL.page_user.nick_name").then(function(nick_name) {
			user_name = nick_name;
			if (show_debug) console.debug('user_name:', user_name);
			return nick_name;
		});
	}
	return Promise.resolve(user_name);
}

function set_mute(pid, c) {
	localScript(function(args) {
		var a = PlurksManager.getPlurkById(args.pid);
		a.is_unread = args.c == 2 ? 0 : 2;
		PlurksManager.switchMute(args.pid);
	}, {
		pid: pid,
		c: c
	});
}

function do_match(text) {
	for (i in keywords) {
		var k = keywords[i];
		if (k.match(/^\/.*\/[igm]*$/)) k = eval(k);
		var r = text.match(k);
		if (r != null) {
			return true;
		}
	}
	return false;
}

function exclude_mute() {
	var $me = $("div.plurk.plurk_box"),
		plurk_id = getPlurkIdByElement($me),
		i;
	if (!plurk_id) return;

	if ((i = jQuery.inArray(plurk_id, exclude_mute_plurk)) != -1) {
		exclude_mute_plurk.splice(i, 1);
		set_mute(plurk_id, 2);
		$("#excludemute").html("不自動消音");
	} else {
		exclude_mute_plurk.push(plurk_id);
		set_mute(plurk_id, 0);
		$("#excludemute").html("自動消音");
	}
	chrome.extension.sendRequest({
		type: 'setOptions',
		key: 'exclude_mute',
		value: JSON.stringify(exclude_mute_plurk)
	}, function(response) {});
	console.debug('exclude_mute_plurk:', exclude_mute_plurk);
	return false;
}

function mute_user() {
	var $me = $("div.plurk.plurk_box"),
		plurk_id = getPlurkIdByElement($me),
		i;
	if (!plurk_id) return;

	if ($me.find("td.td_qual span.q_replurks").length > 0) var nameid = $me.find('div.text_holder span:first-child a').attr('href').match(/\/(\w+)/)[1];
	else var nameid = $me.find('a.name').attr('href').match(/\/(\w+)/)[1];
	if (!user_name) getusername();
	if (user_name && user_name == nameid) return;
	i = jQuery.inArray(nameid, keywords);
	if (i == -1) i = jQuery.inArray("@" + nameid, keywords);
	if (i != -1) {
		keywords.splice(i, 1);
		set_mute(plurk_id, 0);
		$("#excludeuser").html("消音此人");
	} else {
		keywords.push("@" + nameid);
		set_mute(plurk_id, 2);
		$("#excludeuser").html("不消音此人");
	}
	chrome.extension.sendRequest({
		type: 'setOptions',
		key: 'mute_keywords',
		value: JSON.stringify(keywords)
	}, function(response) {});
	console.debug('keywords:', keywords);
	return false;
}

function getPlurkIdByElement(element) {
	var $me = $(element),
		plurk_id = $me.data("pid");
	if (!plurk_id) {
		plurk_id = $me.attr("id").match(/p(\d+)/);
		if (!plurk_id) return;
		plurk_id = plurk_id[1];
	}
	return plurk_id;
}

var last_plurkbox = null;

function getPlurkData(plurk_id) {
	return localScript(async function(plurk_id) {
		let plurk = PlurksManager.getPlurkById(plurk_id);
		function getUserByIdAsync(uid) {
			return new Promise(function(resolve, reject) {
				jQuery.when(Users.fetchUsersIfNeeded([uid], "gp")).always(function () {
					resolve(Users.getUserById(uid));
				});
			});
		}
		let user = await getUserByIdAsync(plurk.owner_id);
		return {
			plurk_id: plurk.plurk_id,
			content: plurk.content,
			content_raw: plurk.content_raw,
			is_unread: plurk.is_unread,
			is_replurk: !!plurk.replurker_id,
			limited_to: plurk.limited_to,
			owner: {
				uid: user.uid,
				display_name: user.display_name,
				nick_name: user.nick_name,
				is_me: SiteState.getSessionUser().id == user.uid,
				is_friend: user.uid in window.FRIENDS
			}
		}
	}, plurk_id);
}

function filter_plurk(plurk_id) {
	if (!plurk_id) return Promise.resolve();

	let self = $("#p" + plurk_id),
		isPlurkBox = self.length > 0 && self.hasClass("plurk_box");

	return getPlurkData(plurk_id).then(function(plurk) {
		if (plurk.owner.is_me || plurk.limited_to && plurk.limited_to != "|0|") {
			if (isPlurkBox && last_plurkbox != plurk.plurk_id) {
				$("#excludemute").html("");
				$("#excludeuser").html("");
				last_plurkbox = plurk.plurk_id;
			}
			return false;
		}
		if (isPlurkBox && last_plurkbox != plurk.plurk_id) {
			if ($("#excludemute").length < 1) {
				$("#form_holder .info_box .perma_link").parent().append($("<div/>", {
					"class": "perma_link",
					html: $("<a/>", {
						id: "excludemute",
						href: "#",
						click: exclude_mute
					})
				}), $("<div/>", {
					"class": "perma_link",
					html: $("<a/>", {
						id: "excludeuser",
						href: "#",
						click: mute_user
					})
				}));
			}
			if (exclude_mute_plurk.indexOf(plurk.plurk_id) != -1) $("#excludemute").html("自動消音");
			else $("#excludemute").html("不自動消音");
			if (keywords.indexOf(plurk.owner.display_name) != -1 || keywords.indexOf("@" + plurk.owner.nick_name) != -1) $("#excludeuser").html("不消音此人");
			else $("#excludeuser").html("消音此人");
			last_plurkbox = plurk.plurk_id;
		}
		if (plurk.is_unread != 1) return false; /* 已讀 */

		if (exclude_mute_plurk.indexOf(plurk.plurk_id) != -1) return false; /* exclude plurk */

		if (plurk.is_replurk && !plurk.owner.is_friend) return true;

		if (do_match(plurk.content_raw) || do_match(plurk.content) || do_match(plurk.owner.display_name) || do_match("@" + plurk.owner.nick_name)) {
			return true;
		}
	}).then(function(mute) {
		if (mute) {
			set_mute(plurk_id, 2);
		}
	});
}

function filter_loaded_plurks() {
	$('div.plurk').each(function() {
		filter_plurk(getPlurkIdByElement(this));
	});
}

function open_options() {
	chrome.extension.sendRequest({
		type: 'openOptions'
	}, function(response) {});
	return false;
}

function listenBroadcastStation(a, b, cb) {
	const id = '__BroadcastStation__' + Math.random();
	localScript(function(args) {
		BroadcastStation.listen(args.a, args.b, function (res) {
			document.dispatchEvent(new CustomEvent(args.id, {
				"detail": res ? res.plurk_id : 0
			}));
		});
	}, {a, b, id});
	document.addEventListener(id, function(e) {
		cb(e.detail);
	});
}

function bindEvent() {
	listenBroadcastStation("plurk", "update", filter_plurk);
	listenBroadcastStation("poll", "new_response", filter_plurk);

	$("#timeline_holder").on("click", ".plurk", function(e) {
		filter_plurk(getPlurkIdByElement(this));
	});

	bindAddPlurks();
}

function bindAddPlurks() {
	const id = '__PlurkTimelineHolder.addItems__' + Math.random();
	localScript(function(id) {
		PlurkTimelineHolder.prototype.addItems = new Proxy(PlurkTimelineHolder.prototype.addItems, {
			apply: function(target, thisArg, argumentsList) {
				var result = target.apply(thisArg, argumentsList);
				var pids = argumentsList[0].map(p => p.plurk.plurk_id);
				document.dispatchEvent(new CustomEvent(id, {
					"detail": pids
				}));
				return result;
			}
		});
	}, id);
	document.addEventListener(id, function(e) {
		e.detail.forEach(pid => filter_plurk(pid));
	});
}

function plurk_mute_init() {
	// check not mobile page
	if ($(".plurk-feeds").length < 1) {
		localScript(function() {
			return SiteState.canEdit();
		}).catch(function(err) {
			setTimeout(plurk_mute_init, interval);
		}).then(function(canEdit) {
			if (canEdit == true) {
				let p1 = getusername();
				let p2 = load_keywords();
				return Promise.all([p1, p2]).then(function() {
					$(".menu ul li a[href*='/Settings/show?page=theme']").parent().after($("<li/>", {
						"class": "sep"
					}), $("<li/>", {
						html: $("<a/>", {
							css: {
								color: "#aaa",
								cursor: "default"
							},
							text: "Plurk-Mute_v2"
						})
					}), $("<li/>", {
						html: $("<a/>", {
							id: "muteoptions",
							href: "#",
							text: "自動消音設置",
							click: open_options
						})
					}), $("<li/>", {
						"class": "sep"
					}));
					setInterval(load_keywords, 60000);
					bindEvent();
					filter_loaded_plurks();
				});
			}
		});
	}
	if ($("body").hasClass("permaplurk")) {
		$(".adsense").hide();
	}
}

setTimeout(plurk_mute_init, interval);