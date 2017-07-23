'use strict';

let request = require('request');
let cheerio = require('cheerio');
let URL = require('url-parse');
let mongoClient = require('mongodb').MongoClient;
let co = require('co');
let assert = require('assert');

let pageToVisit = "https://www.v2ex.com/";
let urlParser = new URL(pageToVisit);
let pageBaseUrl = urlParser.protocol + '//' + urlParser.host;

class UserModel {
	constructor(userName, baseUrl) {
		this.userName = userName;
		this.baseUrl = baseUrl;
	}

	composeUrl() {
		return this.baseUrl + '/member/' + this.userName;
	}
}

class ItemModel {
	constructor(userName, titleText, itemLink, baseUrl) {
		this.userName = userName;
		this.titleText = titleText;
		this.itemLink = itemLink;
		this.baseUrl = baseUrl;
	}

	composeUrl() {
		return this.baseUrl + this.itemLink;
	}
}

class DataCollector {
	constructor() {
		this.memberMap = new Map();
		this.itemList = [];
	}

	addMemember(userModel) {
		let userName = userModel.userName;
		if (!this.memberMap.has(userName)) {
			this.memberMap.set(userName, userModel);
		}
	}

	appendItem(item) {
		this.itemList.push(item);
	}

	saveToDB() {
		console.log('memberMap size ' + this.memberMap.size + ' itemList size ' + this.itemList.length);
		console.log('save to mongodb');

		co(function* () {
			
		});
	}
}

console.log("Visiting page " + pageToVisit);

request(pageToVisit, function (error, response, body) {
	if (error) {
		console.log("Error: " + error);
	}

	console.log("Status code: " + response.statusCode);

	if (response.statusCode !== 200) {
		return;
	}

	const $ = cheerio.load(body);
	let dataCollector = new DataCollector();
	let userNameArr = [];

	// parse member relative link
	let memLink = $('.cell.item table tbody td:nth-of-type(1) a');
	memLink.each(
		function(index) {
			let currentHref = $(this).attr('href');
			let userNameRegResult = /\/member\/(.+)/.exec(currentHref);
			let userName = userNameRegResult[1];
			let userModel = new UserModel(userName, pageBaseUrl);

			userNameArr.push(userName);

			dataCollector.addMemember(userModel);
		}
	);

	// parse item information
	let itemLink = $('.item_title a'); 
	itemLink.each(
		function(index) {
			let currentHref = $(this).attr('href');
			let titleText = $(this).html();
			let userName = userNameArr[index];

			let itemModel = new ItemModel(userName, titleText, currentHref, pageBaseUrl);

			dataCollector.appendItem(itemModel);
		}
	);
});