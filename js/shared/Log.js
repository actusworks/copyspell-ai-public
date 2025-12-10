let logWindow = null;
let pendingLogs = [];
const DATA = window.copyspell_ai_admin || {}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Log
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function log2(message, data) {
  if (!logWindow || logWindow.closed) {
    logWindow = window.open("", "LogWindow", "width=600,height=400");
    logWindow.document.write(`
      <html>
        <head>
          <title>Log Window</title>
          <style>
            body { font-family: sans-serif; padding: 10px; }
            .entry { border-bottom: 1px solid #ccc; margin-bottom: 10px; }
            .message { font-weight: bold; }
            details { margin-left: 10px; }
            summary { cursor: pointer; }
            pre { background: #f0f0f0; padding: 5px; white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <h2>Log Output</h2>
          <div id="log"></div>
        </body>
      </html>
    `);
    logWindow.document.close();
  }

  const logDiv = logWindow.document.getElementById("log");

  const entry = logWindow.document.createElement("div");
  entry.className = "entry";

  const msg = logWindow.document.createElement("div");
  msg.className = "message";
  msg.textContent = message;

  entry.appendChild(msg);

  if (data !== undefined) {
    const details = logWindow.document.createElement("details");
    const summary = logWindow.document.createElement("summary");
    summary.textContent = "View Data";

    const pre = logWindow.document.createElement("pre");
    pre.textContent = JSON.stringify(data, null, 2);

    details.appendChild(summary);
    details.appendChild(pre);
    entry.appendChild(details);
  }

  logDiv.appendChild(entry);
  logWindow.scrollTo(0, logWindow.document.body.scrollHeight);
}
export function log3(message, data) {
return;
  // Get caller information from stack trace
  const stack = new Error().stack;
  const stackLines = stack.split('\n');
  // Skip first 2 lines: "Error" and this log function
  const callerLine = stackLines[2] || '';
  
  // Extract file, function, and line number
  // Typical format: "at functionName (file:line:column)" or "at file:line:column"
  const match = callerLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/) || [];
  const callerFunction = match[1] || '';
  const callerFile = match[2] ? match[2].split('/').pop().split('\\').pop() : 'unknown';
  const callerLineNum = match[3] || '?';
  
  let caller = `${callerFile}:${callerLineNum}`;
  if (callerFunction ) caller = `<span style="opacity:0.5">${callerFunction} • </span>` + caller;


  //return;
  if (!logWindow || logWindow.closed) {
    logWindow = window.open("", "LogWindow", "width=800,height=600");

    // Write initial HTML skeleton
    logWindow.document.write(`
      <html>
        <head>
          <title>Log Window</title>
          <style>
            body { font-family: sans-serif; padding: 10px; }
            .entry { border-bottom: 1px solid #ccc; margin-bottom: 10px; }
            .message { font-weight: bold; margin-bottom: 5px; }
            pre { background: #f0f0f0; padding: 5px; white-space: pre-wrap; word-wrap: break-word; }
			.json-formatter-row .json-formatter-toggler-link {
				margin-left: -10px;
			}
			.json-formatter-row {
				line-height: 1.3;
			}
          </style>
        </head>
        <body>
          <h2>Log Output</h2>
          <div id="log"></div>

		  
          <script src="https://cdn.jsdelivr.net/npm/json-formatter-js@2.5.23/dist/json-formatter.umd.min.js"></script>
          <script>
            window.isReady = false;
            
            window.receiveLog = function(message, data, caller) {
              var logDiv = document.getElementById("log");

              var entry = document.createElement("div");
              entry.className = "entry";

              var flex = document.createElement("div");
              flex.style.display = "flex";
              flex.style.justifyContent = "space-between";
              flex.style.gap = "8px";
              entry.appendChild(flex);

              var msg = document.createElement("div");
              msg.className = "message";
              msg.textContent = message;
              flex.appendChild(msg);

              var callerDiv = document.createElement("div");
              callerDiv.style.fontSize = "0.9em";
              callerDiv.style.color = "#666";
              callerDiv.innerHTML = caller;
              flex.appendChild(callerDiv);

              if (data !== undefined) {
                try {
                  if (typeof JSONFormatter !== 'undefined') {
                    var formatter = new JSONFormatter(data, 0,{
                      hoverPreviewEnabled: false,
                      hoverPreviewArrayCount: 100,
                      hoverPreviewFieldCount: 5,
                      animateOpen: true,
                      animateClose: true,
                      theme: null,
                      useToJSON: true,
                      sortPropertiesBy: null,
                      maxArrayItems: 100,
                      exposePath: false
                    });
                    entry.appendChild(formatter.render());
                  } else {
                    throw new Error('JSONFormatter not loaded');
                  }
                } catch (e) {
                  // Fallback to simple pre element
                  var pre = document.createElement("pre");
                  pre.textContent = JSON.stringify(data, null, 2);
                  entry.appendChild(pre);
                }
              }

              logDiv.appendChild(entry);
              window.scrollTo(0, document.body.scrollHeight);
            };

            // Mark as ready and process pending logs
            window.markReady = function() {
              window.isReady = true;
              if (window.processPendingLogs) {
                window.processPendingLogs();
              }
            };

            // Wait for JSONFormatter to load, then mark ready
            setTimeout(function() { window.markReady(); }, 100);
          </script>
        </body>
      </html>
    `);

    logWindow.document.close();

    // Set up pending logs processor
    logWindow.processPendingLogs = () => {
      while (pendingLogs.length > 0) {
        const [msg, data, caller] = pendingLogs.shift();
        logWindow.receiveLog(msg, data, caller);
      }
    };

    // Add current log to pending
    pendingLogs.push([message, data, caller]);

    // Wait for window to be ready
    const checkReady = () => {
      if (logWindow.isReady) {
        logWindow.processPendingLogs();
      } else {
        setTimeout(checkReady, 50);
      }
    };
    
    setTimeout(checkReady, 100);
  } else {
    if (logWindow.isReady) {
      logWindow.receiveLog(message, data, caller);
    } else {
      pendingLogs.push([message, data, caller]);
    }
  }
}



export default function log( ...args ) {

  	if ( !DATA.mode || DATA.mode !== 'DEV' ) return;

	// Get caller information from stack trace
	const stack = new Error().stack;
	const stackLines = stack.split('\n');
	// Skip first 2 lines: "Error" and this log function


	let callerName = '';
	let funcName = '';
	let callerLines = []
	for ( let i = 2; i < Math.min(12, stackLines.length); i++ ) {

		const callerLine = stackLines[i] || '';
		
		// Check for special case: "at new Promise (<anonymous>)" or similar
		const anonymousMatch = callerLine.match(/at\s+(.+?)\s+\(<anonymous>\)/);
		if (anonymousMatch) {
			const functionName = anonymousMatch[1].trim();
			callerLines.push([ `%c${functionName}%c%c%c`, '' ]);
			continue;
		}
		
		// Extract file, function, and line number
		// Typical format: "at functionName (file:line:column)" or "at file:line:column"
		const match = callerLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/) || [];
		let callerFunction = match[1] || '';
		const callerFilePath = match[2] || 'unknown';
		let callerFile = callerFilePath.split('/').pop().split('\\').pop();
		const callerLineNum = match[3] || '?';
		const callerColNum = match[4] || '?';
		const callerLink = `${callerFilePath}:${callerLineNum}:${callerColNum}`;

		if ( callerFile.includes('load-scripts.php') ) continue;

		let caller = `%c${callerFile}:${callerLineNum}%c`;
		if ( i == 2 ) {
			callerName = `${callerFile.padEnd(30,' ')}${callerLineNum.padStart(5,' ')}`;
			funcName = callerFunction;
		}
		callerFunction = callerFunction || ''
		callerFunction = callerFunction.replace('.<anonymous>', '');

		if ( i == 2 ) {
			callerName = `${callerFile.padEnd(30,' ')}${callerLineNum.padStart(5,' ')}`;
			funcName = callerFunction.padEnd(30,' ');
		}


		//if ( callerFunction ) callerFunction = `•%c${callerFunction}%c`
		//else  callerFunction = '%c%c'
		//caller = `${caller}${callerFunction}`;
		caller = `${caller}%c%c`;
		//if (callerLink ) caller += ' • ' + callerLink;

		


		callerLines.push([ caller, callerLink, callerFunction ]);

	}
	//console.group( caller );
	//console.log( ...args );
	//console.groupEnd();
	
	console.groupCollapsed( '%c'+callerName, 
		'background: #d7e5ffff; color:#444; padding: 3px 6px 2px; border-radius: 3px;',
		//'color:#888888; padding: 3px 6px 2px;',
		//'background: darkorange; color:white; padding: 3px 6px; margin-left: 4px; border-radius: 3px;',
		//'background: #4488FF; color:white; padding: 2px 4px; border-radius: 3px;',
		args[0]
	);
	console.log( '%c'+funcName, 'color:#888888; padding: 3px 6px 2px;' );
	console.log( ...args.slice(1) );
	console.log('──────────────────────────────────────────────────────────────────')
	callerLines.forEach( line => {
		// If there's no link (empty string), don't append the link part
		if (line[1]) {
			console.log( line[0]+` • %c`+line[1], 
				'background: #4488FF; color:white; padding: 2px 4px; border-radius: 3px;',
				'background: transparent; color:#444444;',
				'background: darkorange; color:white; padding: 2px 4px; border-radius: 3px;',
				'background: transparent; color:#444444;',
				'font-size:8px; padding:4px 0; color:#4488FF;');
		} else {
			console.log( line[0], 
				'background: darkorange; color:white; padding: 2px 4px; border-radius: 3px;',
				'background: transparent; color:#444444;',
				'',
				'');
		}
	})
	//console.log(stack)
	console.groupEnd();


}









// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARK: Log
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class Log1 {

	
	// ────────────────────────────────────
	constructor() {
		this.window	= null


	}




}