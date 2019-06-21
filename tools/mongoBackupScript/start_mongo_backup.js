let exec = require('child_process').exec;
let is_tunnel_online=false;
let is_dump_running=false;
let is_restart_in_progress=false;
let backup_done=false;
let is_zipping=false;
let zip_done=false;

/*
Lo script è attivo sulla vm 'datawharehouse', il test di stamani alle 03 è stato eseguito con successo e senza problemi riscontrati.
In questo momento lo script è configurato per partire una volta a settimana, il giovedì mattina alle 03.
Lo script è sulla vm datawharehouse in "/home/data/mongo_remote", il cron è impostato per eseguire "/usr/bin/node start_mongo_backup.js >> /home/data/mongo_remote/notte.log 2>&1" in modo da loggare tutto sul file "/home/data/mongo_remote/notte.log".
I file necessari al funzionamento sono "start_mongo_backup.js" da eseguire tramite node, "mongodump", eseguibile fornito da mongo per il dump dei db, ed infine "ssh_tunnel.sh" che viene eseguito e monitorato da node.

Il funzionamento dello script è il seguente:
>Eseguito "start_mongo_backup.js" tramite node, lui controllerà se esiste già il tunnel, cosa che appena aperto non dovrebbe, e nel caso non ci sia lo crea tramite il file sh.
>Ogni 5 secondi controlla lo stato del tunnel e lo riapre nel caso si sia chiuso.
>Appena il tunnel è aperto e funzionante viene eseguito il backup di mongo.
>Mongodump crea la cartella "dump" che utilizza per inserire i vari db compressi.
>Quando finisce il backup (mongodump), viene zippata la cartella nuovamente e creato uno zip seguendo il naming "mongoback_YYYY-mm-dd_HH-ii-ss.zip" in modo da avere un file solo per backup.
>Alla fine elimina i backup vecchi lasciando solo gli ultimi 3.
*/

function start_tunnel(){
	if(backup_done){
		return;
	}
	console.log('start_tunnel');
	exec('./ssh_tunnel.sh', function callback(error, stdout, stderr){
		if(JSON.stringify(stderr).indexOf('error')>=0){
			console.log('Tunnel start error: ');
			console.log(stderr);
		}else{
			console.log("Tunnel started.");
		}
	});
}
function restart_tunnel(){
	if(backup_done){
		return;
	}
	console.log('restart_tunnel');
	if(!is_restart_in_progress){
		is_restart_in_progress=true;
		if(is_tunnel_online){
			setTimeout(restart_tunnel,5000);
		}else{
			exec('netstat -natp | grep 2700 | awk \'{print $7}\'', function callback(error, stdout, stderr){
				let tunnel_pid = stdout.substring(0,stdout.indexOf('/'));
				console.log(tunnel_pid);
				if(tunnel_pid>0){
					exec('kill '+tunnel_pid+'', function callback(error, stdout, stderr){
						if(JSON.stringify(stderr).indexOf('Failed: error connecting to db server')>=0){
							console.log('Tunnel kill error: ');
							console.log(stderr);
							is_restart_in_progress=false;
						}else{
							start_tunnel();
							is_restart_in_progress=false;
						}
					});
				}else{
					start_tunnel();
					is_restart_in_progress=false;
				}
			});
		}	
	}
}
function check_if_tunnel_exist(){
	if(backup_done){
		return;
	}
	console.log('check_if_tunnel_exist');
	exec('netstat -natp | grep 2700', function callback(error, stdout, stderr){
		console.log(stdout);
		let sout = JSON.stringify(stdout);
		if((sout.indexOf('127.0.0.1:2700')>0)&&(sout.indexOf('0.0.0.0:*')>0)&&(sout.indexOf('LISTEN')>0)){
			console.log('tunnel online');
			is_tunnel_online = true;
			if(!is_dump_running){
				do_backup();
			}
		}else{
			console.log('tunnel offline');
			is_tunnel_online = false;
		}
	});
}
function formatData(data){
	data = data.toString();
	data = data.substring(0,data.length-1);
	data = data.split("\n");
	let line = "";
	for(let x=0;x<data.length;x++){
		line+="\n "+data[x];
	}
	return line;
}
function do_backup(){
	console.log('do_backup');
	if(backup_done){
		console.log("backup is already finished, starting zip procedure");
		//process.exit();
		zip_dump();
		return;
	}
	if(is_dump_running){
		return;
	}
	is_dump_running=true;
	let spawn = require('child_process').spawn,
		ls    = spawn('./mongodump', ['--port', '2700', '--gzip']);
	
	/*
	let spawn = require('child_process').spawn,
		ls    = spawn('./mongodump', ['--port', '2700', '--gzip', '--collection', 'GPS', '--db', 'sharengo']); // test only a small table
	*/

	/*
	setTimeout(function () {
		ls.stdin.pause();
		ls.kill();
	},10000);
	*/
	ls.stdout.on('data', function (data) {
		data = formatData(data);
		console.log('stdout: ' + data);
		if(JSON.stringify(data).indexOf('Failed: error connecting to db server')>=0){
			is_dump_running=false;
			console.log('Errore connessione, restart tunnel');
			restart_tunnel();
		}
	});

	ls.stderr.on('data', function (data) {
		data = formatData(data);
		console.log('stderr: ' + data);
		if(JSON.stringify(data).indexOf('Failed: error connecting to db server')>=0){
			is_dump_running=false;
			console.log('Errore connessione, restart tunnel');
			restart_tunnel();
		}
	});

	ls.on('exit', function (code) {
		console.log('child process exited with code ' + code.toString());
		if(code.toString().charAt(0)==="0"){
			backup_done=true;
			is_dump_running=false;
			console.log('backup effettuato correttamente "'+code.toString()+'"');
			console.log("timeNow",new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
			zip_dump();
		}else{
			console.log("'"+code.toString().charAt(0)+"' '"+code.toString().charAt(1)+"'");
		}
	});

	/*
	exec('./mongodump --port 2700 --gzip', function callback(error, stdout, stderr){
		//console.log(stdout);
		if(JSON.stringify(stderr).indexOf('Failed: error connecting to db server')>=0){
			is_dump_running=false;
			console.log('Errore connessione, restart tunnel');
			restart_tunnel();
		}else{
			backup_done=true;
			is_dump_running=false;
			console.log('backup effettuato correttamente');
			console.log("timeNow",new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
			zip_dump();
		}
	});
	*/
}

function zip_dump(){
	console.log('zip_dump');
	if(!backup_done){
		console.log("backup is still ongoing!");
		return;
	}
	if(is_zipping||zip_done){
		return;
	}
	is_zipping=true;
	let date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g,"-").replace(" ","_");
	exec('zip -r mongoback_"'+date+'.zip" dump', function callback(error, stdout, stderr){
		console.log(stdout);
		if(stderr===""){
			is_zipping=false;
			zip_done=true;
			console.log("backup folder zipped to file");//, deleting old backups");
			//exec con delete vecchi file
			deleteOldBackups();
		}
	});
}
function deleteOldBackups(){
	if(backup_done&&zip_done) {
		exec('ls /home/data/mongo_remote | grep mongoback_ | sort -r', function callback(error, stdout, stderr) {
			let number_of_backups_to_keep=2;
			let list = stdout.substring(0, stdout.length - 1).split("\n");
			if (list.length > number_of_backups_to_keep) {
				for (let x = 0; x < number_of_backups_to_keep; x++) {
					console.log("ok /home/data/mongo_remote/" + list[x]);
				}
				for (let x = number_of_backups_to_keep; x < list.length; x++) {
					console.log("rm /home/data/mongo_remote/" + list[x]);
					exec("rm /home/data/mongo_remote/" + list[x]);
				}
			}
			process.exit();
		});
	}
}

do_backup();
setInterval(check_if_tunnel_exist,5000);
setInterval(function(){console.log("timeNow",new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));},10000);//questa data+ora è in iso per non utilizzare dipendenze