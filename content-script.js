var interval = 500;
var user_name;
var keywords = new Array();
var exclude_mute_plurk = new Array();
var friend_list;
var show_debug = false;

function appendscript(scriptText, args) {
	var args = JSON.stringify(args);
	if (typeof scriptText == 'function')
		scriptText = '(' + scriptText + ')(' + args + ');';

	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.appendChild(document.createTextNode(scriptText));
	document.body.appendChild(script);

	setTimeout(function() {
		script.parentNode.removeChild(script);
	}, 1000);
}

function load_keywords() {
	chrome.extension.sendRequest({
		type: 'getOptions'
	}, function(response) {
		keywords = response.keywords;
		exclude_mute_plurk = response.exclude_mute_plurk;
		show_debug = response.show_debug;
		if (show_debug) console.debug('keywords:', keywords, '\nexclude_mute_plurk:', exclude_mute_plurk);
	});
	$.ajax({
		type: "POST",
		url: "/Friends/getMyFriendsCompletion",
		success: function(data, textStatus, jqXHR) {
			if (typeof data == "string") {
				friend_list = JSON.parse(data);
			} else {
				friend_list = data;
			}
			if (show_debug) console.debug("friend_list", friend_list);
		},
		error: function() {
			setTimeout(load_keywords, 1000);
			console.debug("Get friend list failed");
		}
	});
}

function getusername() {
	user_name = location.href.match(/www.plurk.com\/(\w+)/)[1];
	console.debug('user_name:', user_name);
}

function set_mute(pid, c) {
	if (c) {
		$("#p" + pid + " .mute").html("解除消音").addClass("unmute");
		$("#p" + pid).addClass("muted");
	} else {
		$("#p" + pid + " .mute").html("消音").removeClass("unmute");
		$("#p" + pid).removeClass("muted");
	}
	appendscript(function(args) {
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
		appendscript(function(args) {
			var a = getPD(AJS.$('p' + args.pid)).obj;
			Poll.setPlurkRead(a.id, a.response_count);
		}, {
			pid: pid
		});
	}
	if (c == 2) {
		appendscript(function(args) {
			var a = getPD(AJS.$('p' + args.pid)).obj;
			Signals.sendSignal("plurk_muted", a);
		}, {
			pid: pid
		});
	} else {
		appendscript(function(args) {
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
	getusername();
	if ($("#canEdit").html() == 1) {
		$(".menu ul li a[href*='/Settings/show?page=theme']").parent().after($("<li/>", {
			"class": "sep"
		}), $("<li/>", {
			"class": "nohover",
			html: $("<div/>", {
				html: $("<i/>", {
					css: {
						color: "#aaa"
					},
					text: "Plurk-Mute_v2"
				})
			})
		}), $("<li/>", {
			html: $("<a/>", {
				id: "muteoptions",
				href: "#",
				text: "自動消音設置",
				click: open_options
			})
		}));
		load_keywords();
		setInterval(load_keywords, 60000);
		setInterval(filter_loaded_plurks, interval);
	} else if ($("#canEdit").html() != 0 && user_name != "m") {
		setTimeout(plurk_mute_init, interval);
		appendscript(function() {
			var a = (typeof SiteState != 'undefined' && SiteState.canEdit()) ? '1' : '0',
				b = 'canEdit',
				c = AJS.$(b);
			if (c) {
				AJS.setHTML(c, a);
			} else {
				var s = AJS.SPAN({
					id: b
				}, a);
				AJS.hideElement(s);
				AJS.ACN(AJS.getBody(), s);
			}
		});
	}
	if (user_name == "p") {
		$(".adsense").hide();
	}
}

setTimeout(plurk_mute_init, interval);