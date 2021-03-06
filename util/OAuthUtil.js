var fs = require('fs');
var dotenv = require('./DotEnvUtil');
var reqUtil = require('./RequestUtil');

dotenv.load();


var oAuthUtil = module.exports =  {

	/**
	*	@description 	Method to get a new access token for Salesforce authentication
	*	@arguments		cb - a callback function
	* 	@returns		a call to callback function with a flag to indicate success or failure	
	*/
	getAccessToken: function(cb) {
		
		var consumerKey = process.env.CONSUMER_KEY;
		var consumerSecret = process.env.CONSUMER_SECRET;
		var refreshToken = process.env.REFRESH_TOKEN;

		var options = {
			hostname: "login.salesforce.com",
			path: `/services/oauth2/token?grant_type=refresh_token&client_id=${consumerKey}&client_secret=${consumerSecret}&refresh_token=${refreshToken}`,
			method: 'POST'
		};

		// send the request using request util module
		reqUtil.send(options, null, function(err, response) {
			if(err) {
				if(cb) return (cb(err));
			}

			if(response.statusCode == 200) {
				var body = JSON.parse(response.body);

				if(body.access_token) {
					// update the access token in the config
					oAuthUtil.updateAccessDetails(body, function(done) {
						if(done) return (cb(done));
						else return (cb(!done));
					});
				}
			}				
		});
	},

	/*
	*	@description	Method to update env variables with Salesforce authentication information in .env file 	
	*	@arguments		accesInfo - Salesforce authentication information
	*					cb (optional) - a callback function to invoke on completion
	*	@returns		call to callback function (if one is provided) with a flag to indicate success or failure	
	*/
	updateAccessDetails(accessInfo, cb) {

		var config = '';
		var newVal = '';
		var CONFIG_FILE = '.env';

		if(!fs.existsSync(CONFIG_FILE)) {
			fs.writeFileSync(CONFIG_FILE, '');
		}

		fs.readFile(CONFIG_FILE, 'utf8', function(err, data) {

			if(err) {
				console.log("[error] " + err);
				return;
			}

			config = data;
			// for each key-value pair in access info
			for(var key in accessInfo) {

				if(key.toLowerCase() == "refresh_token") {

					var find = data.match(/REFRESH_TOKEN=[\w&._\\!\\$\\#]+/g);
					newVal = `REFRESH_TOKEN=${accessInfo[key]}`;

					// if the key-value pair already exists, replace it with new value
					if(find) {
						config = config.replace(/REFRESH_TOKEN=[\w&._\\!\\$\\#]+/g, newVal);
					} else {
						config +=  '\n'+ newVal;
					}
				}

				if(key.toLowerCase() == "access_token") {

					var find = data.match(/ACCESS_TOKEN=[\w&._\\!\\$\\#]+/g);
					newVal = `ACCESS_TOKEN=${accessInfo[key]}`;

					// if the key-value pair already exists, replace it with new value
					if(find) {
						config = config.replace(/ACCESS_TOKEN=[\w&._\\!\\$\\#]+/g, newVal);
					} else {
						config +=  '\n'+ newVal;
					}
				}			

				// store instance url
				if(key.toLowerCase() == "instance_url") {
					var find = data.match(/INSTANCE_URL=[\w\d\D].+/g);
					// store instance url only once, its highly unlikely to change
					if(!find) {
						newVal = `INSTANCE_URL=${accessInfo[key]}`;
						config += '\n' + newVal;
					}	
				}

				// extract user id from the identity url and store in config
				if(key.toLowerCase() == "id") {
					var find = data.match(/OWNER_ID=[\w\d]+/g);
					var idUrl = accessInfo[key];
					idUrl = idUrl.replace("https://", '');
					var id = idUrl.split('/')[3];

					newVal = `OWNER_ID=${id}`;

					if(find) {
						config = config.replace(/OWNER_ID=[\w\d]+/g, newVal);
					}
					else {
						config += '\n' + newVal;
					}
				}

			} //for

			fs.writeFile(CONFIG_FILE, config, function(err) {
				if(err) {
					console.error("[error] ", err);
					if(cb) cb(false);
				}
				// reload the env vars 
				dotenv.load();
				if(cb) cb(true);
			});
		});
	}
}