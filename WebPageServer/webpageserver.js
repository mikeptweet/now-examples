var system = require('system');
var fs = require('fs');
var process = require("child_process")
var spawn = process.spawn
var execFile = process.execFile
var db = window.openDatabase('Logs', '1.0', 'Log DB', 1 * 1024 * 1024);
sql("CREATE TABLE IF NOT EXISTS log(entry)");
sql("insert into log VALUES(datetime());");

//var content = fs.read('alasql_xlsx.min.js');
//var lzString=fs.read('lz-string.min.js');
//content +="\nvar sql=alasql;"

var content="";
var lzString="";

//Test
//Test


var pages=[];
var rows=[];

var myCode = function(){/*
var counter=0;

onmessage = function (oEvent) {
	counter++;
    postMessage({
        "id": oEvent.data.id,
        "evaluated": process(oEvent.data.code)
    });
}

function process(code) {
    var result=null;
    try {
        result=eval(code);

    }
    catch(e)
    {
        result = "Error: "+e.message;
    }
    return result;
}
*/}.toString().slice(15,-4)


myCode=content+"\n"+lzString+"\n"+myCode;


function CreateWebWorkerFromCode(code){
	window.URL = window.URL || window.webkitURL;
    var blob;
	try {
		blob = new Blob([code], {type: 'application/javascript'});
	} catch (e) { // Backwards-compatibility
		window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
		blob = new BlobBuilder();
		blob.append(code);
		blob = blob.getBlob();
	}

	var url=URL.createObjectURL(blob);
	var worker = new Worker(url);
	URL.revokeObjectURL(url);

	return worker;
}

var aWorkerListeners = [];
var webWorkers=[];
for(var i=0;i<4;i++){
	webWorkers[i]=CreateWebWorkerFromCode(myCode);
	webWorkers[i].onmessage = function (oEvent) {
		if (aWorkerListeners[oEvent.data.id]) { aWorkerListeners[oEvent.data.id](oEvent.data.evaluated,this); }
		delete aWorkerListeners[oEvent.data.id];
	  };
}

function getRandomWebWorker(arr) {
		return arr[Math.floor(Math.random()*arr.length)];
}

var asyncWebWorkerEval = (function () {
  return function (worker, sCode, fListener) {
    aWorkerListeners.push(fListener || null);
    worker.postMessage({
      "id": aWorkerListeners.length - 1,
      "code": sCode
    });
  };

})();



/*
setInterval(function(){
	console.log("Inserting records");
	sql("insert into log VALUES(datetime());");
},5000);
*/


var aPageListeners = [];
var count=0;
var start=(new Date()).valueOf();
for(var i=0;i<4;i++) {
(function() {
	var page=require('webpage').create();
	pages.push(page);
	page.settings.localToRemoteUrlAccessEnabled=true;
	page.settings.webSecurityEnabled=false;
	//page.navigationLocked=true;
	page.onConsoleMessage = function (msg) {
		console.log(msg);
		count++;
		if(count == 4)
			console.log('Total Elapsed for Load '+((new Date()).valueOf()-start).toString() +"ms");
	};
	page.onCallback = function(oEvent) {
	  //console.log('CALLBACK: ' + JSON.stringify(oEvent));
	  if (aPageListeners[oEvent.id]) { aPageListeners[oEvent.id](oEvent.evaluated,this); }
		delete aPageListeners[oEvent.id];
	};

	page.onInitialized = function() {};

	page.onError = function(msg, trace) {
		var msgStack = ['ERROR: ' + msg];

		if (trace && trace.length) {
			msgStack.push('TRACE:');
			trace.forEach(function(t) {
			  msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
			});
		}
		console.error(msgStack.join('\n'));
	};

 //domtoimage.toPng(document.body).then(function(d){window.open(d);})
	page.open("WebPageEvaluate.html",
		function (status) {
			//page.injectJs('utilities.js');
			//page.injectJs('saker-1.0.0.js');
			//page.injectJs('alasql_xlsx.min.js');
			//page.injectJs('dom-to-image.min.js');
			//page.includeJs('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js', function() {
			//		console.log("lz-string.min.js library loaded");
			//});
			/*
			page.includeJs('https://cdnjs.cloudflare.com/ajax/libs/deepstream.io-client-js/2.0.0/deepstream.js', function() {
					console.log("deepstream.js library loaded");
					page.injectJs('deepStreamTest.js');
			});

			page.includeJs('https://serverless.mybluemix.net/realtime/bayeux/client.js', function() {
					console.log("realtime.js library loaded");
			});
			*/
			console.log("Web Page Loaded");
		});
})();
}


var asyncPageEval = (function () {
  return function (worker, sCode, fListener) {
    aPageListeners.push(fListener || null);
	worker.evaluateAsync(function(oEvent) {
      window.postMessage(oEvent);
    }, 0, {
      "id": aPageListeners.length - 1,
      "code": sCode
    });
  };
})();





function getRandomPageWorker(arr) {
		return arr[Math.floor(Math.random()*arr.length)];
}

function sql(stmt,parms,callback) {
    db.transaction(function (tx) {
      tx.executeSql(stmt, parms || [], function (tx, results) {
		var rows=[];
		if (results.rows && results.rows.length) {
		  for (i = 0; i < results.rows.length; i++) {
			rows.push(results.rows.item(i));
		  }
		}
		else {
			rows.push({"message":"sql request successful"});
		}

		if (callback) callback(rows);
      }, function(tx,err) {
        console.log('Sql Error: '+err.message);
      });
    });
}

var counter=0;
var errors=[];
var log=[];
var responses={}

var server, service;
server = require('webserver').create();
service = server.listen(8080, function (request, response) {
	var requestId=performance.now().toString().replace(".","");
	responses[requestId]={
		"timestamp":(new Date()).valueOf(),
		"elapsed":0,
		"request":request,response:""
	};
	counter++;
	log.push(JSON.stringify(request,null,2));

	var path=unescape(request.url).substr(1);

	var result="";

	switch(path) {
	case "favicon.ico":
        result=" ";
		break;
    case "counter":
        result=counter;
        break;
	case "errors":
        result=errors.join("\n");
        break;
	case "request":
        result=JSON.stringify(request,null,2);
        break;
    case "responses":
        result=JSON.stringify(responses,null,2);
        break;
    default:
	}

	if(path.split("/")[0]=="eval"){
		var cmd=path.split("/")[1];
		var _response="";
		 try {
			 _response=eval(cmd);
		 } catch(e) {
			 _response="Error: "+e.message;
			 errors.push(_response);
		 }
		 result=_response;
	}

	if(path.split("/")[0]=="sql"){
		//var sql = "select sqlite_version() as version";
		//var sql = "select datetime() as time";
		var sql = path.split("/")[1] || "select sqlite_version() as version";
		var start = (new Date()).getTime();
		db.transaction(function (tx) {
				tx.executeSql(sql, [], function (tx,results) {
					var rows=[];
					if (results.rows && results.rows.length) {
					  for (i = 0; i < results.rows.length; i++) {
						rows.push(results.rows.item(i));
					  }
					 var end = (new Date()).getTime();
					  response.statusCode = 200;
					  response.write(JSON.stringify(rows)+"\n Records retrieved in "+(end-start)+" ms");

					  response.close();
					}
					else
					{
						rows.push({"message":"sql request successful"});
						var end = (new Date()).getTime();
						response.statusCode = 200;
						response.write(JSON.stringify(rows)+"\n Records retrieved in "+(end-start)+" ms");
					    response.close();
					}
				},function (transaction, error) {
					response.statusCode = 200;
					response.write("Error processing SQL: "+ JSON.stringify(error));
					response.close();
				});
			  });
	}

	if(path.split("/")[0]=="sql")
		return;

	if(path.split("/")[0]=="cmd"){

		var cmd = path.split("/")[1] || "dir";
		var args=path.split("/").slice(2) || [];
		console.log(JSON.stringify(args));
		var start = (new Date()).valueOf();
		execFile(cmd, args, null, function (err, stdout, stderr) {
			  var result=stdout;
			  if(stderr)
				  result=stderr;
			  if(err)
				  result=err

			  response.statusCode = 200;
			  response.write(result+"\n retrieved in "+((new Date()).valueOf()-start).toString()+" ms");
			  response.close();
			})
	}

	if(path.split("/")[0]=="cmd")
		return;

	if(path.split("/")[0]=="async"){
		var cmd = unescape(path.split("/")[1]);
		var start = (new Date()).valueOf();
		asyncPageEval(getRandomPageWorker(pages),cmd,function(result) {
			response.statusCode = 200;
			result1="Result [" +result+"] returned in "+((new Date()).valueOf()-start).toString()+" ms";
			response.write(result1);
			response.close();
		});
	}

	if(path.split("/")[0]=="async")
		return;


	if(path.split("/")[0]=="worker"){
		var cmd = unescape(path.split("/")[1]);
		var start = (new Date()).valueOf();
		asyncWebWorkerEval(getRandomWebWorker(webWorkers),cmd,function(result) {
			response.statusCode = 200;
			result1="Result [" +result+"] returned in "+((new Date()).valueOf()-start).toString()+" ms";
			response.write(result1);
			response.close();
		});
	}

	if(path.split("/")[0]=="worker")
		return;



	if(result != "") {
		response.statusCode = 200;
		response.write(result);
		response.close();
	}
	else
	{
		var start=(new Date()).valueOf();
		var cmd=unescape(request.url).substr(1);
		var result1=getRandomPageWorker(pages).evaluate(function(s) {
			 var _response="";
			 try {
				 _response=eval(s);
			 } catch(e) {
				 _response="Error: "+e.message;
			 }
			 return _response;
		},cmd);
		var elapsed=((new Date()).valueOf()-start);
		responses[requestId].response=result1;
		responses[requestId].elapsed=elapsed;
		result1="Result [" +result1+"] returned in "+elapsed.toString() +" ms";
		response.statusCode = 200;
		response.write(result1);

		response.close();
	}

});