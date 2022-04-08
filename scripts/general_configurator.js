var equipments = null;
var sets = null;

// Used by getBuffs(), getDebuffs()

const c_data_equipment = "equipment";

const c_scenario_debuffing = -1;
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
	
	_toIndex : function(type){
		switch(type)
		{
			case "weapon": return this.c_weapon;
			case "armor": return this.c_armor;
			case "boots": return this.c_boots;
			case "helmet": return this.c_helmet;
			case "legarmor": return this.c_legarmor;
			case "ring": return this.c_ring;
			default: return -1;
		}
	},

	setAnimal : function(animal) {
		_animal = animal;
	},
		
	setEquipment : function(type, equipment, countOfStars) {
		var index = this._toIndex(type); 
		this._equipments[index] = equipment; // can be null
		this._stars[index] = countOfStars;
	},
	
	getBuffs : function(scenario, starring) {
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
		
		var useMinStars = starring === c_starring_min;
		var useActualStars = starring === c_starring_equipped;
		var useMaxStars = starring === c_starring_max;
		
		var buffs = createBuffs();
		
		for (equipment of this._equipments) {
			if (!equipment){
				// Skip unset equipment.
				continue;
			}
			
			for (attr of equipment.attributes) {
			    /* attr:
			  	  "condition": [],
  				  "troop": ["ground"],
  				  "type": "attack",
  				  "value": 15,
  				  "rate": 1
			    */
			  
			    // 1. get the base buff value
			    var value = attr.value;
			    if (value == 0) {
			    	// This shouldn't happen
			    	continue;
			    } else if (isDebuff && value > 0) {
					// This is buff
					continue;
			    } else if (value < 0) {
					// This is debuff
					continue;
			    }
			    
			    // 2. filter by conditions
			    if (!isDebuff) {
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
			    }
			 
				// 3. calculate the actual buff value
			    if (!useMinStars) {
			    	var count = 0;
			    	if (useActualStars){
			 			var eqIndex = this._toIndex(equipment.type); 
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
			    var catName = attr.type;
			    catName = catName[0].toUpperCase() + catName.substring(1);
			    var attrNames = [];
			    for (troop of attr.troop) {
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

function createBuffs(){
	return {
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
}

function updateBuffTable(buffs, isBuffOrDebuff) {
	var buffCols = $("#" + (isBuffOrDebuff ? "buff" : "debuff") + "-row td");
	var prefix = isBuffOrDebuff ? "" : "-";
	
	buffCols[0].textContent = prefix + buffs.groundAttack + "%";
	buffCols[1].textContent = prefix + buffs.groundDefense + "%";
	buffCols[2].textContent = prefix + buffs.groundHp + "%";
	buffCols[3].textContent = prefix + buffs.mountedAttack + "%";
	buffCols[4].textContent = prefix + buffs.mountedDefense + "%";
	buffCols[5].textContent = prefix + buffs.mountedHp + "%";
	buffCols[6].textContent = prefix + buffs.rangedAttack + "%";
	buffCols[7].textContent = prefix + buffs.rangedDefense + "%";
	buffCols[8].textContent = prefix + buffs.rangedHp + "%";
	buffCols[9].textContent = prefix + buffs.siegeAttack + "%";
	buffCols[10].textContent = prefix + buffs.siegeDefense + "%";
	buffCols[11].textContent = prefix + buffs.siegeHp + "%";
}

function updateStats() {
	// 1. Get battle type
	var battleType = $("input[name='battle-type']:checked").val();
	
	// 2. Calculate and update the buffs
	var buffs = general.getBuffs(battleType, c_starring_equipped);
	updateBuffTable(buffs, true);
	
	// 3. Calculate and update the debuffs
	var debuffs = general.getBuffs(c_scenario_debuffing, c_starring_equipped);
	updateBuffTable(debuffs, false);
	
	// 4. Materials
	// TODO
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

const starIcon = "★";
const nonStarIcon = "☆";
		
function enableEquipmentDropDownMenu(type) {
	// Routine: find the selected equipment
	function findEquipment(sel){
	    var typEqs = sel.data(c_data_equipment);
        var eqName = sel.val();
        var eq = typEqs[eqName];
    	if (!eq){
        	eq = null;
        }
        
        return eq;
	}
	
	// Routine: log the change of equipment
	function logChange(name, count){
	    var sts = "";
        while(count > 0) {
        	sts += starIcon;
        	count--;
        }
        console.log("Changed " + type + " to " + name + (sts === "" ? "" : " (" + sts + ")") + ".");
	}

	// Locate the selector
	var selector = findSelector(type);
	selector.attr("disabled", false);
	
	// Install event handlers
	// (1) Dropdown
	selector.change(function(){
		// get equipment
        var eq = findEquipment($(this));
        
        // get stars
        var stars = findStar(type);
        var count = 0;
        stars.each(function(){
			var st = $(this).text();
			if (st === starIcon) {
				count++;
			}
		});
		
		// set equipment along with stars
        general.setEquipment(type, eq, count);
        
		logChange(eq.name, count);
        
        updateStats();
    });
	
	// (2) Stars
	var stars = findStar(type);
	stars.click(function(){	
		var count = 0;
		var star = $(this);
		var index = parseInt(star.attr("seq"));
		if (index > 0) {
			count = index + 1;
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
				count = 1;
			}
			
			// always remove the stars from the rest
			for (var i = 1; i <= 4; i++){
				var st = stars[i];
				st.textContent = nonStarIcon;
			}
		}
		
        // set equipment along with stars
        var eq = findEquipment(selector);
        if (!!eq) {
        	general.setEquipment(type, eq, count);
        	logChange(eq.name, count);
        }
        
        updateStats();
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
	// All equipments of this type will be stored in a map, attached to the selector.
	var typEqs = {};
	selector.data(c_data_equipment, typEqs);

	var count = 0;
	for (var eq of eqs) {
		var name = eq.name.trim();
		// Use a simplified name, which removes the last word.
		var index = name.lastIndexOf(' ');
		if (index > 1){
			name = name.substring(0, index);
		}
		
		var opt = $("<option>", { value: eq.name }).text(name);
		typEqs[eq.name] = eq;
		selector.append(opt);
		count++;
	}
	
	console.info("Populated " + count + " equipments of type " + type + ".");
	return true;
}