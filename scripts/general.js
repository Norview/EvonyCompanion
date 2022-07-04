// File: general.js
//
// Defines a data model to represent a general.
// For now, this is only used for the equipment configurator, so it only contains equipments (starred) and the animal.
// In the future, will expand this to contain general identity, specialties, skills, the level, etc.

/////////// Private //////////

// Used by _toEquipmentIndex()
const c_weapon = 0;
const c_armor = 1;
const c_boots = 2;
const c_helmet = 3;
const c_legarmor = 4;
const c_ring = 5;

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

// Recognize the full name with or without space, as well as the simple name.
// The index corresponds to the "official" order of those materials as they appear in the items.
function _toMaterialIndex(matName){
	/*
	<th>Purple Crystal</th>
	<th>Blue Stone</th>
	<th>Red Agate</th>
	<th>Silver Pearl</th>
	<th>Meteorolite</th>
	<th>Iron</th>
	<th>Bronze</th>
	<th>Wood</th>
	<th>Animal Bone</th>
	<th>Leather</th>
	<th>Feather</th>
	<th>Dragon Scale</th>
	*/

	matName = matName.toLowerCase();
	switch(matName)
	{
		case "purple crystal":
		case "purplecrystal": 
		case "crystal":
			return 0;
		case "blue stone":
		case "bluestone": 
		case "stone":
			return 1;
		case "red agate":
		case "redagate": 
		case "agate":
			return 2;
		case "silver pearl":
		case "silverpearl": 
		case "pearl":
			return 3;
		case "meteorolite":
		case "meteor":
			return 4;    
		case "iron":
			return 5;    
		case "bronze":
			return 6;    
		case "wood":
			return 7;
		case "animal bone":
		case "animalbone": 
		case "bone":
			return 8;    
		case "leather":
			return 9;
		case "feather":
			return 10;
		case "dragon scale":
		case "dragonscale": 
		case "scale":
			return 11;    
		default:
			return -1;
	}
};

/////////// API //////////

////// Constructors //////

function General(){
	this._reset = function (that) {
		that._animal = null;
    	that._equipments = [null, null, null, null, null, null];
    	that._stars = [0, 0, 0, 0, 0, 0];
	};
	
	this._reset(this);
}

General.prototype.clone = function(){
	var another = new General();
	
	another._animal = this._aminal;
	
	// Must copy each element faithfully. 
    // Using "for ... of" would be problematic as it will end at the last element.
    	
    another._equipments = [];
    for (var index = 0; index < 6; index++) {
    	var eq = this._equipments[index];
    	another._equipments.push(eq);
    }
    
    another._stars = [];
    for (var index = 0; index < 6; index++) {
    	var star = this._stars[index];
    	another._stars.push(star);
    }
    
    return another;
}
   
///////// Setters /////////

General.prototype.setAnimal = function(animal) {
	this._animal = animal;
}
        
General.prototype.setEquipment = function(type, equipment, countOfStars) {
	var index = _toEquipmentIndex(type); 
	this._equipments[index] = equipment; // can be null
	this._stars[index] = countOfStars;
}

General.prototype.reset = function() {
	this._reset(this);
}
    
///////// Getters /////////

// Get the spirit animal or dragon
General.prototype.getAnimal = function() {
	return this._animal;
}

// Get the equipments
General.prototype.getEquipments = function() {
	var equipments = [];
    for (var index = 0; index < 6; index++) {
    	var eq = this._equipments[index];
    	equipments.push(eq);
    }
    
	return equipments;
}

// Get a string key that represents the current equipment combination.
//
// - includeAnimal: if true, also includes the animal
// - starring: if given a valid value, also includes the stars
//
// Returns a string of format ((<eqName>|null)(\(<eqStars>\))?}/){6}{animalName}
//
// Examples:
// (1) getStringKey()
//     (Do not include animal; do not use stars) 
//     => "Ares Bow/Ares Armor/.../Ares Ring"
// (2) getStringKey(true, c_starring_equipped)
//     (Include animal; use assigned stars)
//     => "Ares Bow(3)/Ares Armor(4)/.../Fafnir"
General.prototype.getStringKey = function(includeAnimal, starring) {
	var useMinStars = starring === c_starring_min;
	var useActualStars = starring === c_starring_equipped;
	var useMaxStars = starring === c_starring_max;
			
	var key = "";
    for (eq of this._equipments) {
    	if (!!eq){
    		key += eq.name;
			
			var stars = -1;
			if (useMinStars){
				stars = 0;
			} else if (useMaxStars){
				stars = 5;
			} else if (useActualStars) {
				var index = _toEquipmentIndex(eq.type);
				stars = this._stars[index];
				if (isNaN(stars)){
					stars = 0;
				}
			}
			
			if (stars > -1){
				key += "(";
				key += stars;
				key += ")";
			}
			
			key += "/";
    	} else {
    		key += "null/";
    	}
    }
    
    if (!!includeAnimal){
    	if (!!this._animal){
    		key += this._animal.name;
    	} else {
    		key += "null";
    	}
    }
    
	return key;
}

// Returns an object that represents the count of materials of each type, at different levels.
// So far, we only support level 6 and 7 materials.
//
// - includeBase: if true, also count in the materials for crafting the "base" equipment. An Ares
// equipment has a Dragon equipment as the base.
General.prototype.getMaterials = function(includeBase) {
	var countBase = !!includeBase;
	var materials = {
		lv6 : [0,0,0,0,0,0,0,0,0,0,0,0],
		lv7 : [0,0,0,0,0,0,0,0,0,0,0,0]  
	};
	
	var eqs = [];
	for (var i = 0; i < 6; i++) {
		var eq = this._equipments[i];
		if (!!eq) {
			eqs.push(eq);
			if (countBase) {
				var baseEq = eq.condition.base;
				if (!!baseEq) {
					eqs.push(baseEq);
				}
			}
		}
	}
	
	for (equipment of eqs) {
		if (!equipment){
			// Skip unset equipment.
			continue;
		}
		
		/*
		  "cost": [ 
			{
			  "name": "agate",
			  "level": 7,
			  "quantity": 15
			},
			...
		*/
		var cost = equipment.cost;
		for (c of cost) {
			var mats = c.level == 7 ? materials.lv7 : (c.level == 6 ? materials.lv6 : null);
			if (!!mats) {
				var index = _toMaterialIndex(c.name);
				if (index >= 0 // Name recognized
					&& !isNaN(c.quantity)) { // Quantity is a number
					mats[index] += c.quantity;
				}
			}
		}
	}
	
	return materials;
}

// Returns a buffs object that contains debuff value for each of 12 debuff categories (Enemy G/M/R/S * A/D/HP).
General.prototype.getDebuffs = function(scenario, starring) {
	return this.getBuffs(c_scenario_debuffing);
}

// Returns a buffs object that contains buff value for each of 12 buff categories (G/M/R/S * A/D/HP).
General.prototype.getBuffs = function(scenario, starring) {
	// Routine: find an element by absolute equality from the array.
	// Returns true if found, false if not.
	function findCond(conds, toFind){
		return !!conds.find(function(e) { return e === toFind; });
	}
	
	// scenario: 
	//   "any"           - the buffs are always applicable
	//   "attacking"     - when attacking
	//   "defending"     - when defending the city (defense general)
	//   "reinforcing"   - when reinforcing another city
	//   "occupying"     - when defending an occupied building, including throne city and temples
	//   "debuffing"     - a special value to indicate that we are calculating debuffs instead of buffs.
	
	var isDebuff = c_scenario_debuffing === scenario;
	
	var isAny = c_scenario_any === scenario;
	var isAttacking = c_scenario_attacking === scenario;
	var isDefending = c_scenario_defending === scenario;
	var isReinforcing = c_scenario_reinforcing === scenario;
	var isOccupying = c_scenario_occupying === scenario;
	var isInCity = isDefending || isReinforcing;
	
	var useMinStars = starring === c_starring_min;
	var useActualStars = starring === c_starring_equipped;
	var useMaxStars = starring === c_starring_max;
	
	var buffs = {
		groundAttack: 0,
		groundDefense: 0,
		groundHp: 0,
		mountedAttack: 0,
		mountedDefense: 0,
		mountedHp: 0,
		rangedAttack: 0,
		rangedDefense: 0,
		rangedHp: 0,
		siegeAttack: 0,
		siegeDefense: 0,
		siegeHp: 0
	};
	
	var setPieces = {};
	var buffSources = [];
	
	// Collect buff effects from the equipments
	for (equipment of this._equipments) {
		if (!equipment){
			// Skip unset equipment.
			continue;
		}
		
		// Gather the piece count of each set
		var setName = equipment.set.name;
		var val = setPieces[setName];
		if (isNaN(val)){
			val = 0;
		}
		setPieces[setName] = val + 1;    
		
		for (attr of equipment.attributes) {    
			buffSources.push({
				srcType : equipment.type,
				attribute : attr
			});
		}
	}
	
	// Collect buff effects from the equipment sets
	for (let setName in setPieces) {
	   if (setPieces.hasOwnProperty(setName)) {
		  var pcCount = setPieces[setName];
		  var theSet = sets[setName];
		  
		  /*
		  "name": "Achaemenidae",
		  "attributes": [
			{
			  "pieces": 2,
			  "condition": ["attacking"],
			  "troop": ["ground", "mounted", "ranged", "siege"],
			  "type": "attack",
			  "value": 10
			}
		  ]
		  */
		  
		  for (attr of theSet.attributes) {
			  if (pcCount >= attr.pieces) {
				  // Met required count
				  buffSources.push({
					  srcType :  "set",
					  attribute : attr
				  });
			  }
		  }
	   }
	}
	
	// Calculate buffs 
	for (buffSrc of buffSources) {
		var type = buffSrc.srcType;
		var isSetBuff = type === "set";
		var attr = buffSrc.attribute;
		/* attr:
		  "condition": [],
		  "troop": ["ground"],
		  "type": "attack",
		  "value": 15,
		  "rate": 1
		*/
		
		var attrTyp = attr.type;
		if (attrTyp !== "attack" && attrTyp !== "defense" && attrTyp !== "hp") {
			// For now, we only support these three. May add others such as range in the future.
			continue;
		}
	  
		// 1. get the base buff value
		var value = attr.value;
		if (value == 0) {
			// This shouldn't happen
			continue;
		} else if (isDebuff && value > 0) {
			// This is buff
			continue;
		} else if (!isDebuff && value < 0) {
			// This is debuff
			continue;
		}
		
		// 2. filter by conditions
		if (!isDebuff) {
			var conditions = attr.condition;
			var hasConditions = (!!conditions && conditions.length > 0);
			if (hasConditions && isAny){
				// Must skip any conditional buffs since we are specifying a scenario.
				// One exception - the condition is being with dragon.
				if (!(conditions.length === 1 && conditions[0] === "w/dragon")) {
					continue;
				}
			}
		
			// In-city attribute only takes effect when defending a city, either own or another's.
			var isInCityOnly = findCond(conditions, "in-city");
			if (isInCityOnly && !isInCity) {
				continue;
			}
		   
			// Marching attribute doesn't take effect when defending own city or reinforcing others' city. 
			var isMarchingOnly = findCond(conditions, "marching");
			if (isMarchingOnly && isInCity) {
				continue;
			}
		
			// Requires attacking but we are not
			var isAttackingOnly = findCond(conditions, "attacking");
			if (isAttackingOnly && !isAttacking) {
				continue;
			}
		
			// Requires defending but we are attacking
			var isDefendingOnly = findCond(conditions, "defending");
			if (isDefendingOnly && isAttacking) {
				continue;
			}
		
			// Requires dragon but the general doesn't have one assigned
			var needsDragon = findCond(conditions, "w/dragon");
			if (needsDragon) {
				if (!(!!this._animal && (this._animal.type == "dragon" || this._animal.type == "sacreddragon"))) {
					continue;
				}
			}
		}
	 
		// 3. calculate the actual buff value
		if (!isSetBuff            // set buff doesn't increase per star
			&& !useMinStars) {  // not upgraded
			var count = 0;
			if (useActualStars){
				var eqIndex = _toEquipmentIndex(type); 
				var starCount = parseInt(this._stars[eqIndex]);
				if (!isNaN(starCount)) {
					count = starCount;
				} // if unset, default to 0 
			} else {
				// useMaxStars
				count = 5;
			}
			
			value += attr.rate * count;
		}
		
		// 4. locate the attributes
		attrTyp = attrTyp[0].toUpperCase() + attrTyp.substring(1);
		var attrNames = [];
		for (troop of attr.troop) {
			attrNames.push(troop + attrTyp);
		}
		
		// 5. apply the buff
		for (attrName of attrNames) {
			buffs[attrName] += value;
		}
	}
	
	return buffs;
}

///////// Static Helpers /////////

var _matNames = [
	"purple crystal",
	"purplecrystal",
	"crystal",
	"blue stone",
	"bluestone", 
	"stone",
	"red agate",
	"redagate", 
	"agate",
	"silver pearl",
	"silverpearl", 
	"pearl",
	"meteorolite",
	"meteor",   
	"iron",    
	"bronze", 
	"wood",
	"animal bone",
	"animalbone", 
	"bone",  
	"leather",
	"feather",
	"dragon scale",
	"dragonscale", 
	"scale"
];

// Validate that the equipment contains data matching the expected semantics.
// Throws an error message in string if any invalid case is detected.
General.validateEquipment = function(equipment) {
	function assertString(name, arg, allowEmpty){
		if (typeof(arg) !== "string") {
    		throw name + " is not a string.";
    	}
    	
    	if (!allowEmpty && !arg) {
    		throw name + " is not a non-empty string.";
    	}
	}
	
	function assertOneOf(name, arg, values){
		for (var val of values) {
			if (arg === val) {
				return;
			}
		}
    	
		throw name + " is not recognized: " + arg;
	}
	
	function assertObject(name, arg, ctor) {
		if (!arg) {
    		throw name + " is null, undefined or having invalid value.";
		}
		
		if (typeof(arg) !== "object") {
    		throw name + " is not an object.";
    	}
    	
    	if (!!ctor && arg.constructor !== ctor) {
    		throw name + " is not a(n) " + ctor.name;
    	}
	}
	
	function assertNumeral(name, arg) {
		if (isNaN(arg)) {
    		throw name + " is not a number.";
    	}
	}
	
	// Example data:
	/*
		{
          "name": "Fearless Achaemenidae Boots",
          "set": "Achaemenidae",
          "type": "boots",
          "condition": {
              "building": "forge",
              "level": 33,
              "scroll": "Achaemenidae Boots Scroll",
              "base": null
          },
          "cost": [ 
              {
                "name": "bronze",
                "level": 7,
                "quantity": 30
              }
          ],
          "attributes": [
              {
                  "condition": [],
                  "troop": ["ranged"],
                  "type": "hp",
                  "value": 17,
                  "rate": 1
              },
              {
                  "condition": [],
                  "troop": ["sege"],
                  "type": "attack",
                  "value": -20,
                  "rate": -3
              }
          ]
       },
    */
    
    if (equipment["verified"] === false) {
    	console.warn("Equipment '" + equipment.name + "'s data is not verified.");
    }
    
    var setName = equipment.set;
    assertString("equipment.set", setName, false);
    
    var typeName = equipment.type;
    assertString("equipment.type", setName, false);
    
    var condition = equipment.condition;
    assertObject("equipment.condition", condition);
    
    var building = condition.building;
    assertOneOf("equipment.condition.building", building, ["forge", "wonder"]);
    
    var costs = equipment.cost;
    assertObject("equipment.cost", costs, Array);
    for (var cost of costs) {
    	var cname = cost.name;
    	assertOneOf("equipment.cost.name", cname, _matNames);
    }
    
    for (var attr of equipment.attributes) {
    	var hasConds = false;
    	
    	var conds = attr.condition;
    	assertObject("equipment.attributes.condition", conds, Array);
      	for (var cond of conds) {
    		assertOneOf(
    			"equipment.attributes.condition[]",
    			cond,
    			["in-city", "attacking", "defending", "marching", "reinforcing"
    			, "w/dragon"
    			]);
    		hasConds = true;
    	}

    	var troops = attr.troop;
    	assertObject("equipment.attributes.troop", troops, Array);
    	for (var troop of troops) {
    		assertOneOf(
    			"equipment.attributes.troop[]",
    			troop,
    			["ground", "mounted", "ranged", "siege"]);
    	}
    	
		assertOneOf(
			"equipment.attributes.type",
			 attr.type,
			["attack", "defense", "hp", "range", "marchsize"]);
    	
    	var value = attr.value;
    	assertNumeral("equipment.attributes.value", value);
    	if (value === 0) {
    		throw "equipment.attributes.value is 0.";
    	}
    	
    	var rate = attr.rate;
    	assertNumeral("equipment.attributes.rate", rate);
    	if (rate === 0) {
    		throw "equipment.attributes.rate is 0.";
    	}    	
    	
    	if (value > 0 && rate < 0 || value < 0 && rate > 0) {
    		throw "equipment.attributes.value and equipment.attributes.rate do not have the same sign.";
    	}
    }   
}