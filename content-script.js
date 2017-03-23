var interval = 500;
var user_name = null;
var keywords = new Array();
var exclude_mute_plurk = new Array();
var friend_list;
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
		credentials: 'same-origin',
		method: 'POST'
	}).then(r => r.json()).then(json => {
		friend_list = json;
		if (show_debug) console.debug("friend_list", friend_list);
		return friend_list;
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
	if (c) {
		$("#p" + pid + " .mute").html("解除消音").addClass("unmute");
		$("#p" + pid).addClass("muted");
	} else {
		$("#p" + pid + " .mute").html("消音").removeClass("unmute");
		$("#p" + pid).removeClass("muted");
	}
	localScript(function(args) {
		var a = getPD(AJS.$('p' + args.pid)).obj;
		a.is_unread = args.c;
	}, {
		pid: pid,
		c: c
	});
	$.ajax({
		type: 'POST',
		url: '/TimeLine/setMutePlurk',
		data: 'plurk_id=' + pid + '&value=' + c,
	});
	if (c) {
		$("#p" + pid).removeClass("new");
		localScript(function(args) {
			var a = getPD(AJS.$('p' + args.pid)).obj;
			Poll.setPlurkRead(a.id, a.response_count);
		}, {
			pid: pid
		});
	}
	if (c == 2) {
		localScript(function(args) {
			var a = getPD(AJS.$('p' + args.pid)).obj;
			Signals.sendSignal("plurk_muted", a);
		}, {
			pid: pid
		});
	} else {
		localScript(function(args) {
			var a = getPD(AJS.$('p' + args.pid)).obj;
			Signals.sendSignal("plurk_unmuted", a);
		}, {
			pid: pid
		});
	}
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
		plurk_id = $me.attr("id").match(/p(\d+)/),
		i;
	if (!plurk_id) return;
	plurk_id = plurk_id[1];
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
		plurk_id = $me.attr("id").match(/p(\d+)/),
		i;
	if (!plurk_id) return;
	plurk_id = plurk_id[1];
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

function filter_loaded_plurks() {
	if (!user_name) getusername();
	$('div.plurk').each(function() {
		if ($(this).parents("#colorbox").length > 0) return;
		if ($(this).parents("#colorboxVideo").length > 0) return;
		var $me = $(this),
			plurk_id = $me.attr("id").match(/p(\d+)/),
			text, nameid, name;
		if (!plurk_id) return;
		plurk_id = plurk_id[1];
		var is_replurk = ($me.find("td.td_qual span.q_replurks").length > 0);
		if (is_replurk) {
			text = $me.find('div.text_holder span.text_holder').html();
			nameid = $me.find('div.text_holder span:first-child a').attr('href').match(/\/(\w+)/)[1];
			name = $me.find('div.text_holder span:first-child a').html();
		} else {
			text = $me.find('div.text_holder').html();
			nameid = $me.find('a.name').attr('href').match(/\/(\w+)/)[1];
			name = $me.find('a.name').html();
		}
		if (text.match(/^\[轉噗\]\<a\shref\=\"http\:\/\/tinyurl\.com\/([^\"]+)\"([^\>]+)\>([^\<\>]+)\<\/a\>(\s【卡馬救星】)?$/) /* 卡馬救星 */ || (nameid == "baipu" && text.match(/^哇！今天有\s(\d+)\s位掰噗之友生日喔(.*)$/)) /* 掰噗 */ || (nameid == "pooogle" && text.match(/^\[(\d+)\/(\d+)\]\s恭喜\s(\d+)\s位壽星榜上有名，榮登卡馬警衛首頁。(.*)$/)) /* 卡馬警衛 */ || (nameid == "pooogle" && text.match(/^\[(\d+)\/(\d+)\]\s哇！今天有\s(\d+)\s位捧油生日喔。(.*)$/)) /* 卡馬警衛 */ || (nameid == "pooogle" && text.match(/^\[(\d+)\/(\d+)\]\s又到了我們每日一次的開獎時間了，恭喜今天的\s(\d+)\s位幸運得主。(.*)$/)) /* 卡馬警衛 */ ) {
			$me.hide();
			if ($me.hasClass("new")) set_mute(plurk_id, 2);
			return;
		}
		if (user_name && user_name == nameid) {
			if ($me.hasClass("plurk_box")) {
				$("#excludemute").html("");
				$("#excludeuser").html("");
			}
			return;
		}
		if ($me.hasClass("plurk_box")) {
			if ($("#excludemute").length < 1) {
				$("#form_holder .info_box .perma_link").parent().append($("<div/>", {
					"class": "perma_link",
					id: "ExcludeMuteDiv",
					html: $("<a/>", {
						id: "excludemute",
						href: "#",
						click: exclude_mute
					})
				}), $("<div/>", {
					"class": "perma_link",
					id: "ExcludeUserDiv",
					html: $("<a/>", {
						id: "excludeuser",
						href: "#",
						click: mute_user
					})
				}));
			}
			if (jQuery.inArray(plurk_id, exclude_mute_plurk) != -1) $("#excludemute").html("自動消音");
			else $("#excludemute").html("不自動消音");
			if (jQuery.inArray(nameid, keywords) != -1 || jQuery.inArray("@" + nameid, keywords) != -1) $("#excludeuser").html("不消音此人");
			else $("#excludeuser").html("消音此人");
		}
		if (!$me.hasClass("new")) return;
		if (jQuery.inArray(plurk_id, exclude_mute_plurk) != -1) return;
		var do_mute = false;
		if (is_replurk && friend_list) {
			do_mute = true;
			for (i in friend_list) {
				if (nameid == friend_list[i].nick_name) {
					do_mute = false;
					break;
				}
			}
		}
		if (do_mute || do_match(text) || do_match(name) || do_match(nameid) || do_match("@" + nameid)) {
			set_mute(plurk_id, 2);
			console.debug("set_mute:", name + "(" + nameid + ")", ":", text);
		}
	});
	$("#form_holder .info_box > span").filter(function() {
		return $(this).html() == " ";
	}).html("");
}

function open_options() {
	chrome.extension.sendRequest({
		type: 'openOptions'
	}, function(response) {});
	return false;
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
					setInterval(filter_loaded_plurks, interval);
				});
			}
		});
	}
	if ($("body").hasClass("permaplurk")) {
		$(".adsense").hide();
	}
}

setTimeout(plurk_mute_init, interval);