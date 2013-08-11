//server.js

var config = {
	port: 8080,
};


var protocol = require('../shared/protocol.js');
var watch = require('watch');
var path = require('path');
var fs = require('fs');
var WebSocketServer = require('ws').Server;

// Process command arguments
if (process.argv.length > 1) {
	config.appDirectory = path.normalize(path.join(__dirname, process.argv[2]));
	console.log("opening " +  config.appDirectory);
} else {
	console.log("No path specified.");
	console.log("Usage: node server.js path/to/live/dir");
	process.exit();
}


wss = new WebSocketServer({port: config.port});

wss.on('connection', function(ws) {
	console.log('client connected : %s', ws );
	//Add to connections to broadcast to
	connections.push(ws);

    ws.on('message', function(message) {
    	var command = message;
        switch (command) {
        	case protocol.commands.GET_ALL:
        		console.log('client asking for all files to bootstrap');
        		getFilesRecursive(function (err, files) {
					var response = {};
					response[protocol.EVENT] = protocol.events.FILE_RETURN_ALL;
					response[protocol.FILES] = files;
					ws.send(JSON.stringify(response));
        		});
        		break;
        }
    });
    ws.on('close', function() {
    	var i = connections.indexOf(ws);
    	connections = connections.splice(ws,i);
    	console.log('connection closed. %d connections remain.', connections.length);
    });
    
    ws.on('error', function(e) {
    	console.log('ws error ' + e);
    });
});

var connections = [];

function broadcast(msg) {
	var str = JSON.stringify(msg);
	//console.log(" > %s", str);
	for (var i in connections) {
		connections[i].send(str);
	}
}

function filterObject(o, f) {
	var result = {};
	for (var key in o) {
		if ( f(key, o[key]) ) {
			result[key] = o[key];
		}
	}
	return result;
}

function getFilesRecursive(callback) {
	function isRegularFile(file, stat) {
		return !stat.isDirectory();
	}
	watch.walk(config.appDirectory, {ignoreDotFiles: true}, function (err, fsInfos) {
		var files = [];
		if (err) {
			callback(err, null);
			return;
		};
		fsInfos = filterObject(fsInfos, isRegularFile);
		
		for (var path in fsInfos) {
			var f = {};
			f[protocol.FILE_NAME] = relativePath(path);
			f[protocol.FILE_DATA] = fs.readFileSync(path, 'utf8');
			//console.log("reading file %s => %s", relativePath(path), JSON.stringify(f));
			files.push(f);
			//console.log("files %s", JSON.stringify(files) );
		}
		callback(null, files);
	});
}

function relativePath (f) {
	return path.relative(config.appDirectory, f);
}


watch.createMonitor(config.appDirectory, {interval: 100}, function (monitor) {
	//monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
	
	
	monitor.on("created", function (f, stat) {
		var e = {};
		e[protocol.EVENT] = protocol.events.FILE_CREATED;
		e[protocol.FILE_NAME] = relativePath(f);
		e[protocol.FILE_DATA] = fs.readFileSync(f, 'utf8');
		broadcast(e);
	})
	monitor.on("changed", function (f, curr, prev) {
		//console.log("curr : %@, prev: %@", JSON.stringify(curr), JSON.stringify(prev));
		
		var e = {};
		e[protocol.EVENT] = protocol.events.FILE_CHANGED;
		e[protocol.FILE_NAME] = relativePath(f);
		e[protocol.FILE_DATA] = fs.readFileSync(f, 'utf8');
		broadcast(e);
	})
	monitor.on("removed", function (f, stat) {
		var e = {};
		e[protocol.EVENT] = protocol.events.FILE_REMOVED;
		e[protocol.FILE_NAME] = relativePath(f);
		broadcast(e);
	})
});