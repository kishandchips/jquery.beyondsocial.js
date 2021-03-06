//AJAX request
(function($) {

	$.beyondsocial = function(element, options) {

		var defaults = {
			networks: [{name: 'tumblr', id: 'beyond-t-s'}, {name: 'tumblr', id: 'skindy'}, {name: 'facebook', id: '323476337711540'}],
		    	maxResults: 4,
			template: "mustache/rss.mustache",
			bulkload: true
		}

		var plugin = this;

		plugin.settings = {}
			var result = [];
			var networkResult = [];

		var $element = $(element),
		     element = element;

		plugin.init = function() {
		    plugin.settings = $.extend({}, defaults, options);
		    plugin.bsreplaceurl();
		    	//console.log($element);
		}

		plugin.bsreplaceurl = function () {
			var processList = new Array();
			var parserhelp = new Array();
	

			for (var i = 0; i < plugin.settings.networks.length; i++) {
				var nw = helpers.networkDefs[plugin.settings.networks[i].name]; //get the definitions of the current feed (definitions are at the end of the code)

				//load the social rssfeed with or without googleapi.
				if(nw.googleapi) {
					var netUrl = nw.url;
					var reqUrl = helpers.networkDefs.url;
					// replace params in request url
					netUrl = netUrl.replace("[id]",plugin.settings.networks[i].id);
					reqUrl = reqUrl.replace("[num]",plugin.settings.maxResults);
					reqUrl = reqUrl.replace("[url]", encodeURIComponent(netUrl));
					//console.log(encodeURIComponent(netUrl));
				}
				else {
					var reqUrl = nw.url;
					reqUrl = reqUrl.replace("[id]",plugin.settings.networks[i].id);
					reqUrl = reqUrl.replace("[num]",plugin.settings.maxResults);
				}

				// push onto array. processlist is used for ajax requests, parserhelp to get the definitions
				parserhelp.push(helpers.networkDefs[plugin.settings.networks[i].name].parser);
				processList.push(bsajaxreq(reqUrl));
			}
				//console.log(parser[0].resultsSel);
			window.datacount = i;
			//makes a new array to unify the different feeds, and makes them ready for rendering
			bsunify($, processList, parserhelp);
		}
		//end of bsreplaceurl
		
		var bsajaxreq = function(reqUrl) {
		 	return jQuery.ajax({type: 'GET', dataType: 'jsonp', url:reqUrl, success: function(data){} });
		}
		
		//strips tags from content
		var bsstrip = function(html) {
			var tmp = document.createElement("DIV");
			tmp.innerHTML = html;
			return tmp.textContent || tmp.innerText || "";
		}

		var extractSrc = function(str, object) {
			var src;
			src = $("img", $(str)).attr('src');
			return src;
		}
	
		var bsSortByKey = function(array, key) { //sorts the array by the given keyfield
			return array.sort(function(a, b) {
				var x = a[key]; 
				var y = b[key]; 
				return (parseInt(y) - parseInt(x));});
		}

		//render function + callback (mustache for testing, change to general render function later)
		var bsbulkrenderMustache = function(data, templateuri, callback) {
			$.ajax({
				type: 'GET',
				url:  templateuri,
				success:function(template, textStatus, XMLHttpRequest){
					//console.log(data);
					callback(Mustache.render(template, data));
				},

				error: function(MLHttpRequest, textStatus, errorThrown){
					console.log(errorThrown);
				}
			});
		}
		var bsrenderMustache = function(data, templateuri, callback) {
			var html;
			$.ajax({
				type: 'GET',
				async: false,
				url:  templateuri,
				success:function(template, textStatus, XMLHttpRequest){
					//console.log(data);
					html = Mustache.render(template, data);
				},

				error: function(MLHttpRequest, textStatus, errorThrown){
					console.log(errorThrown);
				}
			});
			return html;
		}

		var bsbulkcallback = function(html) {
			//console.log(html);
			$element.html(html);
		}
		var bsgetfinaldata = function(entries, parserhelp, n) {
			var retarr = new Array();
			for(var j = 0; j<entries.length; j++) {
				var helperA = new Array();
				var entrycontent;
				if(typeof(parserhelp[n].contentSel) == "object") {
					var k = 0;
					for(; !eval("entries[j]"+parserhelp[n].contentSel[k]); k++);
					entrycontent = eval("entries[j]"+parserhelp[n].contentSel[k]);
				
				}
				else{
					entrycontent = eval("entries[j]"+parserhelp[n].contentSel);			//content with tags
				}
				//console.log(entries[j]);
				helperA["title"] = eval("entries[j]"+parserhelp[n].titleSel);			//title
				//convert publishdate to unix timestamp & convert from milliseconds to seconds
				if( typeof (helperA["pubdate"] = eval("entries[j]"+parserhelp[n].dateSel)) != "number") {
					helperA["pubdate"] = Date.parse(helperA["pubdate"]) / 1000;		
				}
				helperA["social"] = parserhelp[n].name;						//name of the social platform
				helperA["link"] = eval("entries[j]"+parserhelp[n].linkSel);			//link to the post
				//gets the first image. from the content or other arrayitems if there is no image get a placeholder
				
				if(helperA["social"] == "instagram") {
					entryimg = extractSrc(eval("entries[j]"+parserhelp[n].imgSel))
					helperA["image"] = entryimg;
				}
				else if(parserhelp[n].imgSel || parserhelp[n].vidSel) {
					if(entryimg = eval("entries[j]"+parserhelp[n].imgSel)){
						helperA["image"] = entryimg;
					}
					else if(entryimg = eval("entries[j]"+parserhelp[n].vidSel)) {
						helperA["image"] = "http://img.youtube.com/vi/"+ entryimg.substring(16)+"/0.jpg";
					}
					else {
						helperA["image"] = "http://placehold.it/100x100&text='No Image'";
					}
			}
				else if(entryimg = extractSrc(entrycontent)) { 
					helperA["image"] = entryimg;
				}
				else {
					helperA["image"] = "http://placehold.it/100x100&text='No Image'";
				}
					//console.log(parserhelp[0]);
				helperA["content"] = bsstrip(entrycontent); 					// strips each feedcontent from its tags
				retarr.push(helperA);
			}
			return retarr;
		}
		//makes a new array to unify the different feeds, and makes them ready for rendering
		var bsunify = function($, processList, parserhelp) {

			//ajax bulk request. data gets loaded into the variable "arguments"
			$.when.apply($, processList).done(function(arg) {
				//if(typeof arguments[1][0].responseJSON != 'undefined')
				//{
					/*console.log(JSON.stringify(arguments));
					test = arguments[1][0];
					console.log(test.responseJSON);*/
				
				//}
				var retarray = new Array();
				if(datacount == 1)					//if there is only 1 feed to go through, arguments is only a one dimensional aray
				{
					entries = eval("arguments[0]"+parserhelp[0].resultsSel);		//the variable "arguments" holds the data
					//console.log(entries);
					networkResult = bsgetfinaldata(entries, parserhelp, 0);
				}
				else if (datacount > 1) {									//for the two-dimensional "arguments" array
					var renderedhtml = "";
					//goes through each entry of every feed to extract the information and put it into another array
					for(var i = 0; i < arguments.length; i++) { 
						//parserhelp[i].mySelector gives you the association names for the various feeds -> search for "networkDefs" in this File for the listing
						entries = eval("arguments[i][0]"+parserhelp[i].resultsSel);		//the variable "arguments" holds the data
						//console.log(entries);
						result = bsgetfinaldata(entries, parserhelp, i);
						//console.log(result);
						if(!plugin.settings.bulkload) {
							networkResult.push(result);
							if (plugin.settings.networks[i].template)
								renderedhtml += bsrenderMustache(result, plugin.settings.networks[i].template);
							else
								renderedhtml += bsrenderMustache(result, plugin.settings.template);
						}
						else {
							for(var x=0; x<result.length; x++)
								networkResult.push(result[x]);
						}
					}
					
				}
				if(plugin.settings.bulkload || datacount == 1) {
						networkResult = bsSortByKey(networkResult, "pubdate");			//result is now sorted by Date with the fields: content, image, link, pubdat, social, title;
						//console.log(result);
						bsbulkrenderMustache(networkResult, plugin.settings.template,bsbulkcallback);
				}
				else {
					bsbulkcallback(renderedhtml);
				}
			}/*)(datacount, processList)*/);
		}

    	plugin.init();
	}

    $.fn.beyondsocial = function(options) {
        return $(this).each(function() {
            if (undefined == $(this).data('beyondsocial')) {
                var plugin = new $.beyondsocial(this, options);
                $(this).data('beyondsocial', plugin);
            }
        });

    }


//Helpers; check networkdefs.txt for further reference
	var helpers = {
		networkDefs: {
			url:"http://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=[num]&callback=?&q=[url]",
			facebook:{
				url:'http://www.facebook.com/feeds/page.php?id=[id]&format=rss20',   // <- without pictures
				//url:'http://graph.facebook.com/[id]/photos?limit=[num]',           // <- only pictures (may need an own ajax request)
				//url:'https://www.facebook.com/feeds/page.php?id=[id]&format=json', // <- with pictures (does not work with googleapi)
				googleapi: true,
				parser:{
					name: "facebook",
					resultsSel: ".responseData.feed.entries",
					imgSel: "",
					vidSel: "",
					titleSel:".title",
					contentSel:".content",
					dateSel: ".publishedDate",
					linkSel: ".link"
				}
			},
			tumblr:{
				url:'http://[id].tumblr.com/api/read/json?callback=?&num=[num]',
				googleapi: false,
				parser:{
				    	name: "tumblr",
					resultsSel: ".posts",
					imgSel: "['photo-url-100']",
					vidSel: "['video-source']",
					titleSel:"['regular-title']",
					contentSel: [ "['conversation-text']", "['regular-body']", "['link-description']", "['regular-title']", "['photo-caption']", "['video-caption']" ],
					dateSel:"['unix-timestamp']",
					linkSel: ".url"
				}
			},
			pinterest:{
				url:'https://www.pinterest.com/[id]/feed.rss',
				googleapi: true,
				parser:{
				    	name: "pinterest",
					resultsSel: ".responseData.feed.entries",
					imgSel: "",
					vidSel: "",
					titleSel:".title",
					contentSel:".content",
					dateSel: ".publishedDate",
					linkSel: ".link"
				}
			},
			instagram:{
				url:'http://ink361.com/feed/user/[id]',
				googleapi: true,
				parser:{
				    	name: "instagram",
					resultsSel: ".responseData.feed.entries",
					imgSel: ".content",
					vidSel: "",
					titleSel:".notitle",
					contentSel:".title",
					dateSel: ".publishedDate",
					linkSel: ".link"
				}
			}
			/*facebook:{url:'http://graph.facebook.com/[id]/photos?limit=[num]',img:'',dataType:'json',
				parser:{
			    name: "facebook",
			    resultsSelector: "data.data",
			    heading: "Facebook",
			    headingSelector: "item.from.name",
			    txtSelector: "item.from.name",
			    dateSelector: "helpers.timeAgo(item.created_time)",
			    imgSrcSelector: "(item.images[2].source)||'/spacer.gif'",
			    imgSrcProcessor: null,
			    imgHrefSelector: "item.link",
			    imgAltSelector: "item.from.name.substring(0,12)",
			    link: "#",
			    preProcessor: null,
			    preCondition: "true"}
			},*/
			
		}
		/*buildItem: function(itemObj,container,fields) {
			var $headDiv = $('<div class="head"/>'),
		            $source = $('<div class="source"></div>'),
		            $sourceLnk = $('<a href="'+itemObj.img.href+'" title="'+itemObj.link.title+'"></a>'),
		            $sourceLnkDiv = $('<div/>'),
		            $apiSpan = $('<div class="api"></div>'),
		            $apiSpanLnk = $('<a href="'+itemObj.img.href+'"></a>'),
		            $contentDiv = $('<div class="content"/>'),
		            $contentDivInner = $('<div>'+itemObj.txt+' </div>'),
		            $imgLnk = $('<a href="'+itemObj.img.href+'" title="'+itemObj.link.title+'"></a>'),
		            $img = $('<image src="'+itemObj.img.src+'" alt="'+helpers.stripHtml(itemObj.img.alt)+'">'),
		            $shareDiv = $('<div class="share"><a href="#" title='+itemObj.api+'>fb</a>|<a href="#" class="x">tw</a></div>'),
		            $dateSpan = $('<div class="date"/>'),
		            $footDiv = $('<div class="foot"/>');
		},*/
	}

})(jQuery);













//End, old content following.













/*
function beyondsocial(id, feed, callback) {

	var type;
	//hardcoded types for the social network feeds
	if(feed == 'facebook') {
		type = 'json';
	}
	else {  type = 'rss20';}
	//end
	
	//main ajax request to get the rss feed
	jQuery.ajax({
		type: 'POST',
		url: rssproxyajax.ajaxurl,
		data: {
			action: 'rssproxyfeed',
			rpfeed: feed,			//define social network (facebook, tumblr, ...)
			rptype: type,			//type of feed? (rss20, JSON, ...)
			rpid: id			//identifier of the profilepage (number for facebook, blogname for tumblr ...)
		},
		dataType: 'jsonp',			//resulting data is a json string
 
		success:function(data, textStatus, XMLHttpRequest){
			callback(data);
		},
 
		error: function(MLHttpRequest, textStatus, errorThrown){
			console.log(errorThrown);
		}
 
	});
}

function rssbulkproxy(callback) {

	//main ajax request to get the rss feed
	jQuery.ajax({
		type: 'POST',
		url: rssproxyajax.ajaxurl,
		data: {
			action: 'rssbulkproxyfeed'
		},
		dataType: 'jsonp',			//resulting data is a json string
 
		success:function(data, textStatus, XMLHttpRequest){
			callback(data);
		},
 
		error: function(MLHttpRequest, textStatus, errorThrown){
			console.log(errorThrown);tumblr link for feedapi
		}
 
	});
}
$.fn.socialist.defaults = {
	networks: [{name:'facebook',id:'in1dotcom'},{name:'tumblr',id:'beyond-t-s'}],
	random: true,
	isotope: true,
	headingLength: 31,
	textLength: 160,
	maxResults: 7,
	autoShow: true,
	fields:['source','heading','text','date','image','followers','likes','share']
}

    $.fn.socialist.settings = {}
//blueprint
*/
