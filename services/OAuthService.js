var express = require('express'); 
var router = express.Router();
var path = require('path');
var dotenv = require('../util/DotEnvUtil');
var https = require('https');

var oAuthUtil = require('../util/OAuthUtil.js');
// load env vars from .env
dotenv.load();

// route to login into salesforce using OAuth2
router.get('/', function(req, res) {
	var consumerKey = process.env.CONSUMER_KEY;
	var callbackUri = process.env.SFDCCALLBACK_URI || "http://localhost:3000/v1/sfdcconsumer/oauth/success";

	var options = {
		protocol: 'https://',
		hostname: 'login.salesforce.com',
		path: `/services/oauth2/authorize?response_type=token&client_id=${consumerKey}&redirect_uri=${callbackUri}&display=popup`
	}

	res.redirect(options.protocol + options.hostname + options.path);
});


// route to handle Salesforce OAuth success/failure callback . This route should match the callback url provided in the Salesforce connected app
router.get('/oauth/success', function(req, res) {
	var p = __dirname;
	var s = p.split('/');
	p = p.replace(s[s.length-1], '');
	p = path.join(p, '/public/success.html');
	// serve a html page
	res.sendFile(p);
});


// route to extract hash paramerts provided in the url by Salesforce OAuth after successful authentication
router.post('/oauth/hashparams', function(req, res) {
	var accessToken = `\nACCESS_TOKEN=${req.body.access_token}`;
	var refreshToken = `\nREFRESH_TOKEN=${req.body.refresh_token}`;
	var data = accessToken + refreshToken;
	oAuthUtil.updateAccessDetails(req.body);
	res.json('success');
});


// route to get the admin panel page for the app
router.get('/admin', function(req, res) {
	var p = __dirname;
	var s = p.split('/');
	p = p.replace(s[s.length-1], '');
	p = path.join(p, 'public/admin.html');
	res.sendFile(p);
});


// route to request new access token using a refresh token
router.get('/accesstoken', function(req, res){
	dotenv.load();
	var response = res;

	var consumerKey = process.env.CONSUMER_KEY;
	var consumerSecret = process.env.CONSUMER_SECRET;
	var refreshToken = process.env.REFRESH_TOKEN;

	var options = {
		hostname: "login.salesforce.com",
		path: `/services/oauth2/token?grant_type=refresh_token&client_id=${consumerKey}&client_secret=${consumerSecret}&refresh_token=${refreshToken}`,
		method: 'POST'
	};

	oAuthUtil.getAccessToken(function(err) {
		if(err) {
			response.redirect('/');
		}
		response.end("Token refreshed");
	});
	
});

module.exports = router;