// File: shared.js
//
// Shared consts and functions

const c_weapon = 0;
const c_armor = 1;
const c_boots = 2;
const c_helmet = 3;
const c_legarmor = 4;
const c_ring = 5;

function _fromEquipmentIndex(index){
	switch(index)
	{
		case 0: return "weapon";
		case 1: return "armor";
		case 2: return "boots";
		case 3: return "helmet";
		case 4: return "legarmor";
		case 5: return "ring";
		default: return "";
	}
}

function _toEquipmentIndex(type){
	switch(type)
	{
		case "weapon": return c_weapon;
		case "armor": return c_armor;
		case "boots": return c_boots;
		case "helmet": return c_helmet;
		case "legarmor": return c_legarmor;
		case "ring": return c_ring;
		default: return -1;
	}
}

// Usage: _foreachEqType(function(eqType) { ... });
var _foreachEqType = 
(function() {
	const _equipmentTypes = ["weapon","armor","boots","helmet","legarmor","ring"];
	
	return function(func){
		for (let _typ of _equipmentTypes) {
			func(_typ);
		}
	};
})();

// Usage: simply instantiate with "new UrlInfo()"
var UrlInfo = (function (){
// shared "private"
var s_argNames = ["lang", "selection"];

// ctor of UrlInfo
return function(){
	function extractArgs(loc){	
		function extractArg(urlParams, name, args){
			var value = urlParams.get(name);
			if (typeof value === 'string'){
				if (name !== "selection") { // Special: this needs to preserve the case
					value = value.trim().toLowerCase();
				}
				if (value !== "") {
					args.set(name, value);
				}
			}
		}
	
		var map = new Map();
	
		const queryString = loc.search;
		const urlParams = new URLSearchParams(queryString);
		for (let an of s_argNames) {
			extractArg(urlParams, an, map);
		}
	
		return map;
	}
	
	var loc = window.location;
	
	var map = extractArgs(loc);
	//  The part of URL until '?' (excluded)
	var url = loc.protocol + "//" + loc.host + loc.pathname;
	
	// Public members
	
	// All arguments are exposed as property
	for (let an of s_argNames) {
		this[an] = map.get(an) || null;
	}
	
	// The URL without query string
	this.getPath = function() { return url; }
	
	// Regenerate a URL based on the current arguments
	this.toUrl = function() {
		function appendArg(appendTo, name){
			var value = that[name];
			if (!!value){
				if (!!appendTo) {
					appendTo += "&";
				} else {
					appendTo = "?";
				}

				appendTo += (name + "=" + value)
			}
			
			return appendTo;
		}
		
		var that = this;
		var path = this.getPath();
		var args = "";
		for (let an of s_argNames) {
			args = appendArg(args, an);
		}
	
		return path + args;
	}
}})();