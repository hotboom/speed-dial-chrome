function addNewEntryButton() {
	var entryHtml = '<div class="entry" id="new_entry"><div><i class="foundicon-plus"></i></div></div>';

	$("#dial").append(entryHtml);
	$("#new_entry").click(function() {
		showBookmarkEntryForm("New Bookmark or Folder", "", "", "");
	});

	scaleSpeedDialEntry($("#new_entry"));
}

function addSpeedDialEntry(bookmark) {
	var entry = null;

	if (bookmark.hasOwnProperty("title") && bookmark.hasOwnProperty("url")) {
		$("#dial").append(getEntryHtml(bookmark));
		entry = $("#" + bookmark.id);
		entry.find(".edit").click(function(event) {
			event.preventDefault();
			showBookmarkEntryForm("Edit Bookmark: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
		});
		entry.find(".remove").click(function(event) {
			event.preventDefault();
			if (confirm("Are you sure you want to remove this bookmark?")) {
				removeBookmark(bookmark.id);
				var old_url = entry.find(".bookmark").prop("href");
				updateCustomIcon("", old_url);
			}
		});

		//If custom icon for the URL exists, evaluates to true & centers it on the dial
		if (JSON.parse(localStorage.getItem("thumbnail_urls"))[bookmark.url]) {
			entry.find(".image").css({
				"background-size": "contain",
				"background-position": "center"
			});
		}

		scaleSpeedDialEntry(entry);
		$("#new_entry").appendTo($("#dial")); // Keep the new entry button at the end of the dial
		} else if (bookmark.hasOwnProperty("children") && localStorage["show_subfolder_icons"] === "true") {
		var entryHtml =	'<div class="entry" id="' + bookmark.id + '">' +
						'<a class="bookmark" href="newtab.html#' + bookmark.id + '" title="' + bookmark.title + '" >' +
							'<div class="imgwrapper"><span class="foldericon foundicon-folder"></span></div>' +
							'<table class="details">' +
							'<tr>' +
							'<td class="edit" title="Edit"><span class="foundicon-edit"></span></td>' +
							'<td class="title"><div>' + bookmark.title + '</div></td>' +
							'<td class="remove" title="Remove"><div class="foundicon-remove"></div></td>' +
							'</tr>' +
							'</table>' +
						'</a>' +
					'</div>';
		$("#dial").append(entryHtml);
		entry = $("#" + bookmark.id);
		entry.find(".edit").click(function(event) {
			event.preventDefault();
			showBookmarkEntryForm("Edit Folder: " + bookmark.title, bookmark.title, bookmark.url, bookmark.id);
		});
		entry.find(".remove").click(function(event) {
			event.preventDefault();
			if (confirm("Are you sure you want to remove this folder including all of it's bookmarks?")) {
				removeFolder(bookmark.id);
			}
		});

		scaleSpeedDialEntry(entry);
		$("#new_entry").appendTo($("#dial")); // Keep the new entry button at the end of the dial
	}
}

// Figures out how big the dial and its elements should be
// Needs to be called before the dial and entries are created
function calculateSpeedDialSize() {
	var dialColumns = parseInt(localStorage["dial_columns"]);
	var dialWidth = parseInt(localStorage["dial_width"]);

	var borderWidth = 14;
	var minEntryWidth = 120 - borderWidth;
	var adjustedDialWidth = parseInt($(window).width() * 0.01 * dialWidth);

	var entryWidth = parseInt(adjustedDialWidth / dialColumns - borderWidth);
	if (entryWidth < minEntryWidth) {
		entryWidth = minEntryWidth;
		adjustedDialWidth = parseInt(adjustedDialWidth / (minEntryWidth + borderWidth)) * (minEntryWidth + borderWidth);
	}
	var entryHeight = parseInt(entryWidth * 0.75); // height = 3/4 width
	$("#dial").css("width", adjustedDialWidth);
	$("#entry_height").val(entryHeight);
	$("#entry_width").val(entryWidth);
}

// Removes all entries under the dial
function clearSpeedDial() {
	$(".entry").each(function() {
		$(this).remove();
	});
}

/* Retrieve the bookmarks bar node and use it to generate speed dials */
function createSpeedDial(folderId) {
	clearSpeedDial();

	chrome.bookmarks.getSubTree(folderId, function(node) {
		var folder = {
			"folderId": folderId,
			"folderName": node[0].title,
			"folderNode": node[0]
		};

		calculateSpeedDialSize();
		addNewEntryButton();

		$("#dial").prop("folder", folderId);
		loadSetting($("#new_entry"), localStorage["show_new_entry"]);
		loadSetting($("#folder_list"), localStorage["show_folder_list"]);

		for (var index in folder.folderNode.children) {
			addSpeedDialEntry(folder.folderNode.children[index]);
		}

		if (localStorage["drag_and_drop"] === "true") {
			// distance 20 - dont drag the bookmark until the cursor has moved 20 pixels
			// forcePlaceHolderSize true - make a placeholder between the bookmarks when dragging
			// containment parent - dont let the user drag a bookmark out of the container
			// tolerance pointer - move the dragged bookmark to the spot under the cursor
			// items "> div:not(.new_entry)" - drag all objects on the top level exept for new_entry
			$("#dial").sortable({
				distance: 20,
				forcePlaceholderSize: true,
				containment: "parent",
				tolerance: "pointer",
				items: "> div:not(#new_entry)",
				stop: function(evebt, ui) {
					updateBookmarksOrder()
				}
			});
		}
	});
}

// Gets the HTML of the entry to be inserted into the dial
function getEntryHtml(bookmark) {
	var entryHtml =	'<div class="entry" id="' + bookmark.id + '">' +
					'<a class="bookmark" href="' + bookmark.url + '" title="' + bookmark.title + '" >' +
						'<div class="imgwrapper"><div class="image" style="background-image:url(' + getThumbnailUrl(bookmark.url) + ')" /></div>' +
						'<table class="details">' +
						'<tr>' +
						'<td class="edit" title="Edit"><span class="foundicon-edit"></span></td>' +
						'<td class="title"><div>' + bookmark.title + '</div></td>' +
						'<td class="remove" title="Remove"><div class="foundicon-remove"></div></td>' +
						'</tr>' +
						'</table>' +
						'</div>' +
					'</a>' +
					'</div>';
	return entryHtml;
}

function getThumbnailUrl(url) {
	if (JSON.parse(localStorage.getItem("thumbnail_urls"))[url]) {
		return JSON.parse(localStorage.getItem("thumbnail_urls"))[url];
	} else {
		if (localStorage["force_http"] === "true") {
			url = url.replace("https", "http");
		}
		return localStorage["immediatenet_url"].replace("[URL]", url);
	}
}

function updateCustomIcon(url, old_url) {
	var icon_object = JSON.parse(localStorage.getItem("thumbnail_urls"));
	var custom_icon = $(".icon").val();

	//Creates a new key:value pair and merges it into JSON from localStorage
	var new_icon = {};
	new_icon[url] = custom_icon;
	var temp_object = $.extend(icon_object, new_icon);

	//Makes sure thumbnail URL changes along with the bookmark URL
	if (url !== old_url) {
		delete temp_object[old_url];
	}
	//Removes empty URL entries from localStorag
	if (custom_icon.trim().length === 0 || url.trim().length === 0) {
		delete temp_object[url];
		delete temp_object[old_url];
	}

	localStorage.setItem("thumbnail_urls", JSON.stringify(temp_object));
	createSpeedDial(getStartingFolder());
}

// Removes a bookmark entry from the speed dial
function removeSpeedDialEntry(id) {
	$("#" + id).remove();
}

// Scales a single speed dial entry to the specified size
function scaleSpeedDialEntry(entry) {
	var captionHeight = 20;
	var entryHeight = $("#entry_height").val();
	var entryWidth = $("#entry_width").val();

	entry.css("height", entryHeight);
	entry.css("width", entryWidth);

	if (entry.prop("id") !== "new_entry") {
		var title = entry.find(".bookmark").prop("title");
		var titleLimit = entryWidth / 10;
		if (title.length > titleLimit) {
			title = title.substr(0, titleLimit - 3) + "...";
		}
		entry.find(".imgwrapper").css("height", entryHeight - captionHeight);
		entry.find(".title").text(title);
	}

	entry.find(".foundicon-folder").css("font-size", entryWidth * 0.5);
	entry.find(".foundicon-folder").css("top", entryWidth * 0.05);
	entry.find(".foundicon-plus").css("font-size", entryWidth * 0.3);
	entry.find(".foundicon-plus").css("top", entryWidth * 0.18);
}

function showBookmarkEntryForm(heading, title, url, target) {
	var form = $("#bookmark_form");

	form.find("h1").text(heading);
	form.find(".title").val(title);
	form.find(".url").val(url);
	form.find(".icon").val(JSON.parse(localStorage.getItem("thumbnail_urls"))[url]);
	form.find(".target").val(target);

	//Selector to hide URL & custom icon fields when editing a folder name
	$("h1:contains('Edit Folder')").parent().find("p:eq(1),p:eq(2)").hide();
	//Selector to hide the cusom icon field adding new entries
	$("h1:contains('New Bookmark or Folder')").parent().find("p:eq(2)").hide();

	form.reveal({
		animation: "none"
	});
	form.find(".title").focus();

	$(".close-reveal-modal").click(function(event) {
		$("p").show();
	});
}

function updateSpeedDialEntry(bookmark) {
	var entry = $("#" + bookmark.id);

	entry.find(".bookmark").prop("href", bookmark.url);
	entry.find(".bookmark").prop("title", bookmark.title);
	entry.find(".title").text(bookmark.title);
}

$(document).ready(function() {
	initialise();
	generateFolderList();
	createSpeedDial(getStartingFolder());

	$("#bookmark_form .title, #bookmark_form .url").keyup(function(e) {
		if (e.which === 13) {
			$("#bookmark_form button").trigger("click");
		}
	});

	$("#bookmark_form button").click(function() {
		var target = $("#bookmark_form .target").val();
		var title = $("#bookmark_form .title").val();
		var url = $("#bookmark_form .url").val();

		if (target.length > 0) {
			updateBookmark(target, title, url);
		} else {
			addBookmark(title, url);
		}
	});

	$(window).resize(function() {
		calculateSpeedDialSize();
		$(".entry").each(function(index) {
			scaleSpeedDialEntry($(this));
		});
	});

	// Change the current dial if the page hash changes
	$(window).bind("hashchange", function(event) {
		setCurrentFolder(getStartingFolder());
	});
});
