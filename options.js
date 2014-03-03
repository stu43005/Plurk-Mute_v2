var keywords;
var key_groups = [
	["星座噗", "白羊", "金牛", "雙子", "巨蟹", "獅子", "處女", "天秤", "天蠍", "射手", "摩羯", "水瓶", "雙魚", "牡羊"]
];

function save_options() {
	localStorage['mute_keywords'] = JSON.stringify(keywords);
	restore_options();
	$("#status").html("Options Saved.").show();
	setTimeout(function() {
		$("#status").fadeOut();
	}, 1000);
}

function del_keywords(i) {
	$("#del_keyword").html('刪除:&nbsp;' + htmlspecialchars(keywords[i]) + '<br/>').append(
	$("<a/>").attr("href", "#").bind("click", function(e) {
		e.stopPropagation();
		keywords.splice(i, 1);
		save_options();
		$("#del_keyword").fadeOut().html("");
		return false;
	}).html("Yes")).append("、").append(
	$("<a/>").attr("href", "#").bind("click", function(e) {
		e.stopPropagation();
		$("#del_keyword").fadeOut().html("");
		return false;
	}).html("No")).fadeIn();
}

function add_keyword() {
	var val = $("#keyword").val();
	if(val == "") return;
	$("#keyword").val("");
	if(jQuery.inArray(val, keywords) != -1) return;
	keywords.push(val);
	save_options();
	$("#del_keyword").fadeOut().html("");
}

function add_groups(i) {
	for(j = 1; j < key_groups[i].length; j++) {
		if(key_groups[i][j] && jQuery.inArray(key_groups[i][j], keywords) == -1) {
			keywords.push(key_groups[i][j]);
		}
	}
	save_options();
}

function restore_options() {
	$("#key_groups").html("")
	for(i in key_groups) {
		if(i != 0) $("#key_groups").append(",&nbsp;<wbr/>");
		$("#key_groups").append(
		$("<a/>").attr("href", "#").data("id", i).bind("click", function(e) {
			e.stopPropagation();
			add_groups($(this).data("id"));
			return false;
		}).html(htmlspecialchars(key_groups[i][0])));
	}
	keywords = split_mute_keywords(localStorage["mute_keywords"]);
	console.debug('keywords:', keywords);
	$("#mute_keywords").html("");
	for(i in keywords) {
		if(i != 0) $("#mute_keywords").append(",&nbsp;<wbr/>");
		$("#mute_keywords").append(
		$("<a/>").attr("href", "#").data("id", i).bind("click", function(e) {
			e.stopPropagation();
			del_keywords($(this).data("id"));
			return false;
		}).html(htmlspecialchars(keywords[i])));
	}
}

jQuery(document).ready(function() {
	restore_options();
	$("#add_form").bind("submit", function(e) {
		e.stopPropagation();
		add_keyword();
		return false;
	});
});