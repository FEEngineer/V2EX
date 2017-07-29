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

	constructUserMapValueList() {
		let userList = [];

		for (let user of this.memberMap.values()) {
			userList.push(user);
		}

		return userList;
	}

	saveToUserCollection() {
		console.log('save user info to mongodb');

		let userList = this.constructUserMapValueList();
		console.log('user list size ' + userList.length + ", will be inserted into db v2ex, collection user");

		co(function* () {
			let db = yield mongoClient.connect('mongodb://localhost:27017/v2ex');
			console.log("Connect correctly to server");

			for (let user of userList) {
				let insertRes = yield db.collection('user').insert(user);
				assert.equal(1, insertRes.insertedCount);
			}

			db.close();
		}).catch(function (err) {
			console.log(err.stack);
		});
	}

	saveToItemCollection() {
		console.log('save item list to mongodb');
		console.log('item list size ' + this.itemList.size + ' itemList size ' + this.itemList.length);

		let itemList = this.itemList;

		co(function* () {
			let db = yield mongoClient.connect('mongodb://localhost:27017/v2ex');
			console.log("Connect correctly to server");

			for (let item in itemList) {
				let insertRes = yield db.collection('item').insert(itemList[item]);
				assert.equal(1, insertRes.insertedCount);
			}

			db.close();
		}).catch(function (err) {
			console.log(err.stack);
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
		function (index) {
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
		function (index) {
			let currentHref = $(this).attr('href');
			let titleText = $(this).html();
			let userName = userNameArr[index];

			let itemModel = new ItemModel(userName, titleText, currentHref, pageBaseUrl);

			dataCollector.appendItem(itemModel);
		}
	);

	dataCollector.saveToUserCollection();
	dataCollector.saveToItemCollection();
});