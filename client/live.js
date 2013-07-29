// Config

var config = {
	server: 'z.local',
	port: 8080,
};

if ('requirejs' in window) {
	requirejs.config({
		paths: {
			shared: '../shared'
		}
	});
	// Require shared protocol parts
	requirejs(['shared/protocol'], init);
} else {
	var protocol = require('shared/protocol');
	init(protocol);
}



function init (protocol) {

	console.log('connecting to %s on port %d', config.server, config.port);

	var modules = {};

	function backingScale(context) {
		if ('devicePixelRatio' in window) {
			if (window.devicePixelRatio > 1 && context.webkitBackingStorePixelRatio < 2) {
				return window.devicePixelRatio;
			}
		}
		return 1;
	}

	var startTime = Date.now();
	function main(time) {
		var mainModule = 'app.js';
		var app = getLiveModule(mainModule);
		(function () {
			require = function(module) {return innerRequire(module, mainModule)};
			if (app) {
				try {
					app.update(Date.now() - startTime, 1.0 / 60.0);
				} catch (e) {
					console.log('exception in module %s : %s. stack: %s', mainModule, e.toString(), e.stack);
				}
			} else {
				console.log('couldn\'t find app.js');
			}
		})();
		requestAnimationFrame(main);
	};
	main();



	// Live client

	ws = new WebSocket('ws://' + config.server + ':' + config.port + '/');

	ws.onopen = function (event) {
		console.log('opened socket to server, awaiting app load');
		ws.send(protocol.commands.GET_ALL);
	};

	ws.onclose = function (event) {
		console.log('socket closed (%s)', event.reason);
	}

	ws.onmessage = function (event) {
		//console.log('message :' + event.data);
		handleCommand(JSON.parse(event.data));
	};

	function innerRequire(module, name) {
		if (modules[module]) {
			return modules[module].exports;
		} else {
			console.log('live : "' + name + '" asked for missing "' + module + '"');
			return null;
		}
	}
	
	function getLiveModule(name) {
		// Setup new module
		if (!modules[name]) return null;
		if (typeof modules[name].setup == 'function') {
			(function () {
				require = function(module) {return innerRequire(module, name)};
				modules[name].setup();
			})();
			modules[name].setup = undefined;
		}
		return modules[name];
	}

	function initLiveModule(name, str) {
		console.log("reloading %s", name);
		// Tear down old module
		if (modules[name] && modules[name].teardown != undefined) {
			modules[name].teardown();
		}
		
		// eval
		var env = {};
		(function () {
			var exports;
			var setup;
			var update;
			var teardown;
			try {
				function require(module) {return innerRequire(module, name)};
				exports = {};
				eval(str);
				env.exports = exports;
				env.setup = setup;
				env.update = update;
				env.teardown = teardown;
			} catch (e) {
				console.log('exception in module %s : %s. stack: %@', name, e.toString(), e.stack);
				env = null;
			}
		})();
		if (env) {
			modules[name] = env;
		}
	}

	function handleCommand(cmd) {
		var eventType = cmd[protocol.EVENT];
		var fileName = cmd[protocol.FILE_NAME];
		switch (eventType) {
			case protocol.events.FILE_CREATED:
				console.log('file created: %s', cmd[protocol.FILE_NAME]);
				initLiveModule(fileName, cmd[protocol.FILE_DATA]);
				break;
			
			case protocol.events.FILE_DELETED:
				console.log('file deleted: %s', cmd[protocol.FILE_NAME]);
				delete modules[fileName];
				break;
			
			case protocol.events.FILE_CHANGED:
				console.log('file changed: %s', cmd[protocol.FILE_NAME]);
				initLiveModule(fileName, cmd[protocol.FILE_DATA]);
				break;
			
			case protocol.events.FILE_RETURN_ALL:
				var filesList = cmd[protocol.FILES];
				console.log('recieved app from server. loading %d modules', filesList.length);
				for (var i in filesList) {
					var f = filesList[i];
					initLiveModule(f[protocol.FILE_NAME], f[protocol.FILE_DATA]);
				}
				break;
		}
	}
};
