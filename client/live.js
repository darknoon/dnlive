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
		var events = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup'];
		
		console.log("reloading %s", name);
		// Tear down old module
		var oldEnv = modules[name];
		if (oldEnv) {
			if (oldEnv.teardown != undefined) {
				modules[name].teardown();
			}
			for (var i in events) {
				var e = events[i];
				var onE = 'on' + e;
				if (oldEnv[onE] != undefined) {
					window.removeEventListener(e, oldEnv[onE]);
				}
			}
		}
		
		// eval
		var env = {};
		(function () {
			function require(module) {return innerRequire(module, name)};
			
			// TODO: I haven't found a good way to keep all of this state isolated and not have to declare these explicitly
			// Variables are not added to the window because we're eval()ing in a closure.
			var exports;
			var setup;
			var update;
			var teardown;
			var ontouchstart;
			var ontouchmove;
			var ontouchend;
			var onmousedown;
			var onmousemove;
			var onmouseup;
			try {
				exports = {};
				eval(str);
				
				env.exports = exports;
				env.setup = setup;
				env.update = update;
				env.teardown = teardown;

				env.ontouchstart = ontouchstart;
				env.ontouchmove = ontouchmove;
				env.ontouchend = ontouchend;

				env.onmousedown = onmousedown;
				env.onmousemove = onmousemove;
				env.onmouseup = onmouseup;
				
			} catch (e) {
				console.log('exception in module %s : %s. stack: %@', name, e.toString(), e.stack);
				env = null;
			}
		})();
		if (env) {
			modules[name] = env;
		}
		
		if (env) {
			for (var i in events) {
				var e = events[i];
				var onE = 'on' + e;
				if (env[onE] != undefined) {
					window.addEventListener(e, env[onE]);
				}
			}
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
