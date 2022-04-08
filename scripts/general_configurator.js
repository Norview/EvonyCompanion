var equipments = null;
var sets = null;

// Used by getBuffs(), getDebuffs()

const c_scenario_any = 0;
const c_scenario_attacking = 1;
const c_scenario_defending = 2;
const c_scenario_reinforcing = 3;
const c_scenario_occupying = 4;

const c_starring_min = 0;
const c_starring_equipped = 1;
const c_starring_max = 2;

var general = {

	// Used by _toIndex()
	c_weapon : 0,
	c_armor : 1,
	c_boots : 2,
	c_helmet : 3,
	c_legarmor : 4,
	c_ring : 5,

	_animal : null,
	
	_equipments : [],
	
	_stars : [],
	
	_toIndex : function(equipment){
		switch(equipment.type)
		{
			case "weapon": return c_weapon;
			case "armor": return c_armor;
			case "boots": return c_boots;
			case "helmet": return c_helmet;
			case "legarmor": return c_legarmor;
			case "ring": return c_ring;
			default: return -1;
		}
	},

	setAnimal : function(animal) {
		_animal = animal;
	},
		
	setEquipment : function(equipment, countOfStars) {
		var index = _toIndex(equipment); 
		_equipments[index] = equipment;
		_stars[index] = countOfStars;
	},
	
	getBuffs : function(scenario, starring) {
		// scenario: 
		//   null            - the buffs are always applicable
		//   "attacking"     - when attacking
		//   "defending"     - when defending the city (defense general)
		//   "reinforcing"   - when reinforcing another city
		//   "occupying"     - when defending an occupied building, including throne city and temples
		
		var isAny = c_scenario_any === scenario;
		var isAttacking = c_scenario_attacking === scenario;
		var isDefending = c_scenario_defending === scenario;
		var isReinforcing = c_scenario_reinforcing === scenario;
		var isOccupying = c_scenario_occupying === scenario;
		
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
			siegedHp: 0
		}
		
		for (equipment of _equipments) {
			for (attr of equipment.attributes) {
			    /*
			  	  "condition": [],
  				  "troop": ["ground"],
  				  "type": "attack",
  				  "value": 15,
  				  "rate": 1
			    */
			  
			    // 1. get the base buff value
			    var value = attr.value;
			    if (value <= 0) {
			    	// This is debuff
			    	continue;
			    }
			    
			    // 2. filter by conditions
			    var conditions = attr.condition;
			    var hasConditions = (!!conditions && conditions.length > 0);
			    if (hasConditions && !isAny){
			        // Must skip any conditional buffs since we are specifying a scenario.
			        continue;
			    }
			    
			    // In-city attribute only takes effect when defending the city.
			    var isInCity = !!conditions["in-city"];
			    if (isInCity && !isDefending) {
			    	continue;
			    }
			       
			    // Marching attribute doesn't take effect when defending own city or reinforcing others' city (?). 
			    var isMarching = !!conditions["marching"];
			    if (isMarching && (isDefending || isReinforcing)) {
			    	continue;
			    }
			    
			    // Requires attacking but we are not
			    var isAttackingOnly = !!conditions["attacking"];
			    if (isAttackingOnly && !isAttacking) {
			    	continue;
			    }
			    
			    // Requires defending but we are attacking
			    var isDefendingOnly = !!conditions["defending"];
			    if (isDefendingOnly && isAttacking) {
			    	continue;
			    }
			    
			    // Requires dragon but the general doesn't have one assigned
			    var needsDragon = !!conditions["w/dragon"];
			    if (needsDragon) {
			    	if (!(!!this._animal && (this._animal.type == "dragon" || this._animal.type == "sacreddragon"))) {
			    		continue;
			    	}
			    }
			 
				// 3. calculate the actual buff value
			    if (!useMinStars) {
			    	var rate = attr.rate;
			    	var count = useActualStars ? _stars[equipment.type] : 5;
			    	value += rate * count;
			    }
			    
			    // 4. locate the attributes
			    var catName = equipment.type;
			    catName = catName[0].toUpperCase() + catName.substring(1);
			    var attrNames = [];
			    for (troop of equipment.troop) {
			    	attrNames.push(troop + catName);
			    }
			    
			    // 5. apply the buff
			    for (attrName of attrNames) {
			    	buffs[attrName] += value;
			    }
			}
		}
		
		return buffs;
	}
}

// Load data from the server
function initialize() {
$.getJSON("../data/equipments.json", function(data) {
	// All equipments
	equipments = {};
	for (var eq of data.equipments){
		equipments[eq.name] = eq;
	}
	
	// All equipment sets
	sets = {};
	for (var eqSet of data.sets){
		sets[eqSet.name] = eqSet;
	}
	for (var equipment of data.equipments){
		var s = sets[equipment.set];
		if (!!s) {
			equipment.set = s;
		} else {
			console.warn("Equipment " + equipment.name + "'s set doesn't exist.");
		}
	}

	console.log("Data loaded.");
	
	var result = loadUI();
	if (!result) {
		panic("");
		return;
	}
	
	enableUI();
	
	console.log("UI initiated.");
});
}

function panic(message){
	// TODO: this function should show a big red warning and ask for contact to the code owner.
}

function loadUI(){
	var result = true;
	result &&= populateEquipmentDropDownMenu("weapon");
	result &&= populateEquipmentDropDownMenu("armor");
	result &&= populateEquipmentDropDownMenu("boots");
	result &&= populateEquipmentDropDownMenu("helmet");
	result &&= populateEquipmentDropDownMenu("legarmor");
	result &&= populateEquipmentDropDownMenu("ring");
	return result;
}

function enableUI(){
	enableEquipmentDropDownMenu("helmet");
}

function enableEquipmentDropDownMenu(type) {
	// Locate the selector
	var selector = findSelector(type);
	selector.attr("disabled", false);
	
	// Install even handler
	var stars = findStar(type);
	stars.click(function(){
		var starIcon = "★";
		var nonStarIcon = "☆";
	
		var star = $(this);
		var index = parseInt(star.attr("seq"));
		// var text = star.text();
		if (index > 0) {
			// star up to here
			for (var i = 0; i <= 4; i++) {
				var st = stars[i];
				if (i <= index) {
					st.textContent = starIcon;
				} else {
					st.textContent = nonStarIcon;
				}
			}
		} else {
			// special: if the star at the 0th index is the only one, clicking on it means to unstar
			var st0 = stars[0];
			var st1 = stars[1];
			if (st0.textContent === starIcon && st1.textContent === nonStarIcon) {
				st0.textContent = nonStarIcon;
			} else {
				st0.textContent = starIcon;
			}
			
			// always remove the stars from the rest
			for (var i = 1; i <= 4; i++){
				var st = stars[i];
				st.textContent = nonStarIcon;
			}
		}
		
		// trigger recalculation
		// TODO
	});
}

// UI component finders

function findSelector(type){
	return $("#selector-" + type + " select");
}

function findStar(type){
	return $("#selector-" + type + " .star");
}

function findStatRow(type){
	return $("#" + type + "-row");
}

function populateEquipmentDropDownMenu(type) {
	/* Populate <select> with <option>s:
	  <form class="btn" id="selector-weapon">  
		 ...
		 <select style="display: block;">  
		   <option value = "CArsB">Courageous Ares Bow</option>  
		   <option value = "CAchB">Courageous Achae. Bow</option>  
		   <option value = "CivB">Civilization Bow</option> 
		   ...
		 </select>  
	   </form> 
	 */
	 
	// Locate the selector
	var selector = findSelector(type);
	if (!selector){
		console.error("Selector for " + type + " doesn't exist.");
		return false;
	}
	
	// Filter out all equipments by the type
	var eqs = [];
	for (let eqName in equipments) {
	   if (equipments.hasOwnProperty(eqName)) {
		  var eq = equipments[eqName];
		  if (!!eq && eq.type === type){
		  	eqs.push(eq);
		  }
	   }
	}
	
	// Sort 
	eqs.sort(function (e1, e2) {
		/*
	  	"condition": {
  			"building": "forge",
  			"level": 27,
  			"scroll": "Dragon Helmet Scroll",
  			"base": null
  		},
  		*/
  		// First by forge level
		var val = e1.condition.level - e2.condition.level;
		if (val !== 0){
			return val;
		}
		
		// Then by building
		if (e1.condition.building !== e2.condition.building){
			if (e1.condition.building == "forge") {
				return -1;
			} else if (e2.condition.building == "forge") {
				return 1;
			}
		}
		
		// Last alphabetically
		return (e1.name < e2.name ? -1 : 1);
	});

	// Populate the dropdown menu
	
	// Always has an empty option
	var opt = $("<option>", { value: "" }).text("");
	selector.append(opt);

	var count = 0;
	for (var eq of eqs) {
		var name = eq.name.trim();
		// Use a simplified name, which removes the last word.
		var index = name.lastIndexOf(' ');
		if (index > 1){
			name = name.substring(0, index);
		}
		
		var opt = $("<option>", { value: eq.name }).text(name);
		selector.append(opt);
		count++;
	}
	
	console.info("Populated " + count + " equipments of type " + type + ".");
	return true;
}