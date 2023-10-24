// File: general_serializer.js
//
// Serialize and deserialize general

////// Constructor //////

// equipments: object as dict
// sets: array
function GeneralSerializer(equipments, sets){
	// Serialize the equipments into UnencodedString:
	//
	// UnencodedString ::= {SetOrder}(/{SetOrder}){5};{WeaponName}(/{EquipmentSubTypeChar}){5}
	// SetOrder ::= <unsigned integer: set's order as defined in equipments.json>
	// WeaponName ::= <string: full weapon name> | ''
	// EquipmentSubTypeChar ::= 'c'|'f'|'d'|'m'|''
	//
	// If it is a civilization set, WeaponName and EquipmentSubTypeChar are all empty, since there is only one piece at each part.
	//
	// Example:
	//   26/33/51/55//30;King's Bow/f////c
	// represents
    //   King's Bow, Fearless Achae Armor, Plant boots, Koryo helmet, (no leg armor), Courageous Ares Ring
    //
    // Test:
    // http://127.0.0.1/general_configurator.html?selection=MjYvMzAvNTIvNTYvNTYvMzM7S2luZydzIEF4ZS9jLy8vL2Y%3D
    // King's Axe, Courageous Ares Armor, Freedom Boots, Rurik Helmet, Rurik Leg Armor, Fearless Achaemenidae Ring
	
	function _serialize(general){
		var eqs = general.getEquipments();
		var setArr = "";
		var typArr = "";
    	for (var index = 0; index <= c_maxIndex; index++) {
    		var eq = eqs[index];
    		if (!!eq) {
    			var name = eq.name;
    			var order = equipments[name]['set'].order;
    			var eqOd = order.toString();
    			setArr += eqOd;
    			
    			var typ = "";
    			if (order <= c_maxNonCivOrder) { // Not a civ equipment
    				if (index == 0) {
    					typ = name; // For the weapon, use name directly
    				} else {
    					name = name.toLowerCase();
    					if (name.indexOf("fearless") >= 0){
    						typ = "f";
    					} else if (name.indexOf("courageous") >= 0) {
    						typ = "c";
    					} else if (name.indexOf("majestic") >= 0) {
    						typ = "m";
    					} else { // if (name.indexOf("dominant") >= 0)
    						typ = "d";
    					}
    				}
    			}
    			
    			typArr += typ;
    		}
    		
    		if (index != c_maxIndex) {
    			setArr += c_picSplitter;
    			typArr += c_picSplitter;
    		}
    	}
    	
    	return setArr + c_secSplitter + typArr;
	}
	
	// the given key must be decoded, i.e. what _serialize() returns.
	function _deserialize(general, key){
		general.reset();
		var sections = key.split(c_secSplitter);
		var eqOds = sections[0].split(c_picSplitter); // number of empty
		var eqTyps = sections[1].split(c_picSplitter); // weapon's full name, or 'c', or 'f'
    	for (var index = 0; index <= c_maxIndex; index++) {
    		let selectedEq = null;
    		let eqPartName = _fromEquipmentIndex(index);
    		var eqOd = Number.parseInt(eqOds[index]);
    		if (!isNaN(eqOd)) {
    			var setData = that.setsByOrder[eqOd];
    			var pieces = setData.equipments;
    			if (eqOd <= c_maxNonCivOrder) {
    				// Regular eqs require further differentiation
					var eqTyp = eqTyps[index];
					// Check sub-type
    				if (eqPartName == "weapon") {
    					// For the weapon, the subtype is the name
    					for (let pc of pieces) {
    						if (pc.name == eqTyp) {
    							selectedEq = pc;
    							break;
    						}
    					}
    				} else {
    					// For other parts, check the subtype
    					for (let pc of pieces) {
    						if (pc.type == eqPartName) {
								let name = pc.name.toLowerCase();
								if (name.indexOf("fearless") >= 0 && eqTyp === "f") {
									selectedEq = pc;
									break;
								} else if (name.indexOf("courageous") >= 0 && eqTyp === "c") {
									selectedEq = pc;
									break;
								} else if (name.indexOf("majestic") >= 0 && eqTyp === "m") {
									selectedEq = pc;
									break;
								} else if (eqTyp === "d") { // name.indexOf("dominant") >= 0 && 
									selectedEq = pc;
									break;
								}
    						}
    					}
    				}
    			} else {
					for (let pc of pieces) {
						if (pc.type == eqPartName) { // There is only one piece at a given part.
							selectedEq = pc;
							break;
						}
					}
    			}
    		}
			
			if (!!selectedEq) {
				console.info("Selected " + selectedEq.name);
				general.setEquipment(selectedEq.type, selectedEq, c_stars);
			}
    	}
	}
	
	this.encode = function(general) {
		// raw => base64 => urlencode
		var rawKey = _serialize(general);
		return encodeURIComponent(btoa(rawKey));
	}

	this.decode = function(rawKey, general) {
		// urldecode => base64 => raw
		var key = atob(decodeURIComponent(rawKey));
		_deserialize(general, key);
	}
	
	var that = this;
		
	const c_maxNonCivOrder = 40; // As of 2023/08, Parthian at 35 is the max.
	const c_maxIndex = 5; // 6 equipments
	const c_stars = 5; // always the highest
	const c_picSplitter = "/";
	const c_secSplitter = ";";
	
	this.equipments = equipments; // Use as is - an object keyed by name
	this.setsByOrder = new Map(); // Keyed by order
	for (let s of sets) {
		this.setsByOrder[s.order] = { 
			"set" : s,
			"equipments": []
		};
	}
	
	// Add equipment to each set
	for (let eqn in equipments) {
		let eq = equipments[eqn];
		let eqOd = eq.set.order;
		let eqSet = this.setsByOrder[eqOd];
		eqSet.equipments.push(eq);
	}
}

////// Public API //////
GeneralSerializer.initialize = function(equipmentDict, eqSetArray) {
	var _gs;
	
	function _init() {
		if (!_gs) {
			_gs = new GeneralSerializer(equipmentDict, eqSetArray);
		}
	}

	// Generates a URL based on the current address and selected pieces
	GeneralSerializer.serialize = function(general, lang){
		_init();
		var sel = _gs.encode(general);
		var urlInfo = new UrlInfo();
		urlInfo.selection = sel;
		if (!!lang) {
			urlInfo.lang = lang;
		}
		return urlInfo.toUrl();
	}
	
	// This will reset the general's current equipments
	GeneralSerializer.deserialize = function(general){
		var urlInfo = new UrlInfo();
		if (!!urlInfo.selection) {
			_init();
			_gs.decode(urlInfo.selection, general);
		}
	}
}
