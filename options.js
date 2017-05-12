var keywords;

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

function restore_options() {
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
	$("#import").val(localStorage['mute_keywords']);
}

function import_keywords() {
	if (confirm("確定要匯入關鍵字？這將會覆蓋掉原本的設定")) {
		keywords = split_mute_keywords($("#import").val());
		save_options();
	}
}

jQuery(document).ready(function() {
	restore_options();
	$("#add_form").bind("submit", function(e) {
		e.stopPropagation();
		add_keyword();
		return false;
	});

	$("#import_form").bind("submit", function(e) {
		e.stopPropagation();
		import_keywords();
		return false;
	});
});