var chromewindowhack = null,
	unsafeWindow = {},
	extLocalStorage = null
	;

function init() {
	try {
		// Works with Chrome 27 and below. Still need this for S-Browser
		chromewindowhack = document.createElement('div');
		chromewindowhack.setAttribute('onclick', 'return window;');
		if(chromewindowhack.onclick) {
			unsafeWindow = chromewindowhack.onclick();
		}
	}catch(ex1) {
	}
}

init();

var DynFF = {
	m_res : Array(),
	sendMsg : function(text, code) {
		chrome.extension.sendMessage({
			'action' : 'SendError',
			'text' : text,
			'code' : code
		});
	},

	xmlhttpRequest : function(url, callback) {
		chrome.extension.sendMessage({'action' : 'xmlhttpRequest', 'url' : url}, callback);
	},

	getValue : function(name) {
		var res = extLocalStorage[name];
		if (res)
			return res;
		else
			return "";
	},

	setValue : function(name, value) {
		extLocalStorage[name] = value;
		chrome.extension.sendMessage({ 'action' : 'setValue', 'name' : name, 'value' : value });
	},

	clearCache : function() {
		chrome.extension.sendMessage({'action' : 'clearCache'});
	},

	calldebug : function(name) {
		chrome.extension.sendMessage({'action' : name });
	}
};


//If the package contains tag <unsafeWindow> we inject this code in the document, which will create an object DynFFEx.
//It will be send a message to the sandbox.
//In addition, the code sets in the document listener, for receive  response of the sandbox.

//The listener depending on the answer will call the callback function if it is defined in the external script

//function CallbackSetValue - will be called when value will be set.
//passed params
//name - name of the value item

//function CallbackXmlHttpRequest - will be called when a response is received.
//passed params
//url - requested url
//data - response data

//function CallbackGetValue - will be called when the data will be received
//passed params
//name - name of the value item
//data - response data

//function CallbackClearCache - will be called when the cleared cache
//passed params void

//function CallbackSendMsg - will be called when message will be sended
//passed params
//text - message text
//code - the message code

var InjectDynFF = "window.DynFFEx = {" +
	"sendMsg : function(text, code) {" +
		"window.postMessage({" +
			"'action' : 'sendMsg_request'," +
			"'text' : text," +
			"'code' : code" +
		"}, '*');" +
	"}," +

	"xmlhttpRequest : function(url) {" +
		"window.postMessage({" +
			"'action' : 'xmlhttpRequest_request'," +
			"'url' : url" +
		"}, '*');" +
	"}," +

	"getValue : function(name) {" +
		"window.postMessage({" +
			"'action' : 'getValue_request'," +
			"'name' : name" +
		"}, '*');" +
	"}," +

	"setValue : function(name, value) {" +
		"window.postMessage({" +
			"'action' : 'setValue_request'," +
			"'name' : name," +
			"'value' : value" +
		"}, '*');" +
	"}," +

	"clearCache : function() {" +
		"window.postMessage({" +
			"'action' : 'clearCache'" +
		"}, '*');" +
	"}" +
"}; " +
"window.addEventListener('message', function(event) {" +
    "if(event.source != window) {" +
		"return;" +
    "}" +
    "if(event.data.action == 'setValue_response') {"+
    	"if(typeof(CallbackSetValue) !== 'undefined') {"+
    		"CallbackSetValue(event.data.name);"+
    	"}"+
    "}"+
	"if(event.data.action == 'xmlhttpRequest_response') {"+
		"if(typeof(CallbackXmlHttpRequest) !== 'undefined') {"+
    		"CallbackXmlHttpRequest(event.data.url, event.data.data);"+
    	"}"+
    "}"+
    "if(event.data.action == 'getValue_response') {"+
		"if(typeof(CallbackGetValue) !== 'undefined') {"+
    		"CallbackGetValue(event.data.name, event.data.data);"+
    	"}"+
    "}"+
    "if(event.data.action == 'clearCache_response') {"+
		"if(typeof(CallbackClearCache) !== 'undefined') {"+
    		"CallbackClearCache();"+
    	"}"+
    "}"+
    "if(event.data.action == 'sendMsg_response') {"+
    	"if(typeof(CallbackSendMsg) !== 'undefined') {"+
    		"CallbackSendMsg(event.data.text, event.data.code);"+
    	"}"+
    "}"+
"}, false);";

//This listener in the sandbox catching messages that are sent the object DynFFEx from document.
//He retranslating the message to  background.html, where they are processed and are sent back to the sandbox, and from there into the document
window.addEventListener("message", function(event) {
    if(event.source != window) {
		return;
    }

    if(event.data.action) {
    	if(event.data.action == "sendMsg_request") {
    		chrome.extension.sendMessage({'action' : 'SendError', 'text' : text, 'code' : code}, function () {
    			window.postMessage({'action' : 'sendMsg_response',  'text' : text, 'code' : code}, '*');
    		});
    	}

    	if(event.data.action == "xmlhttpRequest_request") {
    		chrome.extension.sendMessage({'action' : 'xmlhttpRequest', 'url' : event.data.url}, function (data) {
    			window.postMessage({'action' : 'xmlhttpRequest_response',  'url' : event.data.url, 'data' : data}, '*');
    		});
    	}

    	if(event.data.action == "getValue_request") {
    		chrome.extension.sendMessage({'action' : 'getValue', 'name' : event.data.name}, function (data) {
    			window.postMessage({'action' : 'getValue_response',  'name' : event.data.name, 'data' : data}, '*');
    		});
    	}

    	if(event.data.action == "setValue_request") {
    		chrome.extension.sendMessage({'action' : 'setValue', 'name' : event.data.name, 'value' : event.data.value}, function () {
    			window.postMessage({'action' : 'setValue_response',  'name' : event.data.name}, '*');
    		});
    	}

    	if(event.data.action == "clearCache_request") {
    		chrome.extension.sendMessage({'action' : 'clearCache'}, function () {
    			window.postMessage({'action' : 'clearCache_response'}, '*');
    		});
    	}
    }

}, false);

function onResCB(res) {
	try {
		DynFF.m_res = res;
	} catch (e) {
	};
}

var dataNodes = null;

function  ParsePackage(data) {
	var nStart = data.iterator;
	var nodes = dataNodes;
	var doc = document;

	////console.log("Enter ParsePackage");

	for(var i  = nStart; i < nodes.length; i++) {

		//if tag <unsafeWindow> exists into package, we inject the DynFFEx object  into document
		var childNodes = nodes[i].getElementsByTagName('unsafeWindow');
		if (childNodes.length > 0) {
			if (!doc.body)
				continue;

			var scr = doc.createElement("script");
			scr.id = "script_" + i;
			scr.innerHTML = InjectDynFF;

			doc.body.appendChild(scr);
		}


		/////////////////////////////////////////////////////////////////////////////////////
		var childNodes = nodes[i].getElementsByTagName('newjs');
		if (childNodes.length > 0) {
			var strCode = childNodes[0].textContent;
			// Read userID
			if (!doc.body)
				continue;
			try {
				chrome.extension.sendMessage({'iterator' : i, 'action' : 'DynConGC_RunJS', 'code' : strCode }, ParsePackage);
			} catch(e) {

			}

			return;
		}
		//////////////////////////////////////////////////////////////////////////////////////////////

		//////////////////////////////////////////////////////////////////////////////////////////////
		var childNodes = nodes[i].getElementsByTagName('externaljs');
		if (childNodes.length > 0) {
			if (!doc.body)
				continue;

			//console.log("externaljs");
			//console.log("");
			//console.log(childNodes[0].getAttribute('url'));

			var id = nodes[i].getAttribute('id');
			if (doc.getElementById("script_" + id)) {
				continue;
			}
			var strUrl = childNodes[0].getAttribute('url');
			var script = doc.createElement("script");
			script.src = strUrl;
			script.id = "script_" + id;
			try {
				script.addEventListener("load", function(e) {
					if(unsafeWindow.DynFF_OnJSLoad) {
						var strCode = 'DynFF_OnJSLoad("' + e.target.src + '");';
						chrome.extension.sendMessage({ 'iterator' : i, 'action' : 'DynConGC_RunJS', 'code' : strCode}, ParsePackage);
					}

                    var element = doc.getElementById("script_" + id);
                    if(element) {
                        element.parentNode.removeChild(element);
                    }

				}, true);
				doc.body.appendChild(script);
			} catch (e) {
			}
			if(unsafeWindow.DynFF_OnJSLoad) {
				return;
			} else {
				//console.log("");
				//console.log("continue");

				continue;
			}
		}
		////////////////////////////////////////////////////////////////////////////////////////////

		////////////////////////////////////////////////////////////////////////////////////////////
		var childNodes = nodes[i].getElementsByTagName('externalcss');
		if (childNodes.length > 0) {
			if (!doc.getElementsByTagName("head") || doc.getElementsByTagName("head").length == 0)
				continue;

			//console.log("externalcss");
			//console.log("");
			//console.log(childNodes[0].getAttribute('url'));

			var id = nodes[i].getAttribute('id');
			if (doc.getElementById("externalcss_" + id)) {
				// alert('ok');
				continue;
			}
			// alert('externalcss');
			var strUrl = childNodes[0].getAttribute('url');
			var ref = doc.createElement("link");
			ref.setAttribute("id", "externalcss_" + id);
			ref.setAttribute("rel", "stylesheet");
			ref.setAttribute("type", "text/css");
			ref.setAttribute("href", strUrl);
			doc.getElementsByTagName("head")[0].appendChild(ref);
			continue;
		}
		////////////////////////////////////////////////////////////////////////////////////////////

		////////////////////////////////////////////////////////////////////////////////////////////

		//console.log("newhtml");
		//console.log("");

		var path = nodes[i].getAttribute('xpath');
		if (!path || path.length == 0)
			continue;

		var id = nodes[i].getAttribute('id');
		if (doc.getElementById(id))
			continue;

		var addchild = nodes[i].getAttribute('child');
		var addtop = nodes[i].getAttribute('top');
		var elements = doc.evaluate(path, doc, null, XPathResult.ANY_TYPE, null);

		var elem = elements.iterateNext();
		if (elem == null)
			continue;

		if (id == "first_run") {

			if (DynFF.getValue('first_run') != "")
				continue;

				DynFF.setValue("first_run", '1');
				chrome.extension.sendMessage({
					'action' : 'SendError',
					'text' : 'FirstRun',
					'code' : 310
				});
		}
		childNodes = nodes[i].getElementsByTagName('newhtml');
		if (childNodes.length > 0) {
			var frame = doc.createElement("span");
			frame.innerHTML = childNodes[0].textContent;
			if (addchild == "1") {
				if (addtop == "1") {
					elem.insertBefore(frame, elem.firstChild);
				} else {
					elem.appendChild(frame);
				}
			} else {
				if (elem.nextSibling)
					elem.parentNode.insertBefore(frame, elem.nextSibling);
				else
					elem.parentNode.appendChild(frame);
			}
		}
		////////////////////////////////////////////////////////////////////////////////////////////

	}
}

function onPackageLoad(data) {
	var doc = document;

	if (!data)
		return;


	var dp = new DOMParser();
	xDoc = dp.parseFromString(data, "text/xml");
	try {

		var nodes = xDoc.getElementsByTagName('content');
		dataNodes = nodes;
		ParsePackage({'iterator' : 0});
	} catch (e) {
	}
};



try {
	chrome.extension.onMessage.addListener(function(request, sender, callback) {
        if (request.res) {
            onResCB(request.res);
            return true;
        } else if (request.action && request.action === 'contentScriptPackage') {
            onPackageLoad(request.package);
            return true;
        }else if (request.action && request.action === 'getUrls') {
            //make available to iframe content script
            var parentHref = document.location.href;
            var parentHost = document.location.host;
            callback({'href': parentHref, 'host': parentHost});
            //chrome.extension.sendMessage({
            //    'action' : 'DynConGC_ResponseParentUrls',
            //    'urls' : {'href': parentHref, 'host': parentHost}
            //});
            return true;
        }
        
    });
        
    chrome.extension.sendMessage({ 'action' : 'getLocalStorage'}, function (data) {
        extLocalStorage = data;
        var doc = document;
        

        chrome.extension.sendMessage({
            'action' : 'DynConGC_GetPackage',
            'url' : doc.location.href,
            'domain' : doc.location.host,
            'returnName': 'contentScriptPackage'
        }, function(data) {
            onPackageLoad(data.package); 
            return true;
        });
	});



} catch (e) {
}
