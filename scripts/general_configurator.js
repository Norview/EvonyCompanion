var equipments = null;
var sets = null;

// Used by getBuffs(), getDebuffs()

const c_data_equipment = "equipment";

const c_scenario_debuffing = "debuffing";
const c_scenario_any = "any";
const c_scenario_attacking = "attacking";
const c_scenario_defending = "defending";
const c_scenario_reinforcing = "reinforcing";
const c_scenario_occupying = "occupying";

const c_starring_min = 0;
const c_starring_equipped = 1;
const c_starring_max = 2;

var general = {

    // Internal members
    
    // Used by _toEquipmentIndex()
    c_weapon : 0,
    c_armor : 1,
    c_boots : 2,
    c_helmet : 3,
    c_legarmor : 4,
    c_ring : 5,

    _animal : null,
    
    _equipments : [],
    
    _stars : [],
    
    _toEquipmentIndex : function(type){
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

    // Recognize the full name with or without space, as well as the simple name.
    // The index corresponds to the "official" order of those materials as they appear in the items.
    _toMaterialIndex : function(matName){
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
    },
    
    // API
    
    // Setters
    
    setAnimal : function(animal) {
        _animal = animal;
    },
        
    setEquipment : function(type, equipment, countOfStars) {
        var index = this._toEquipmentIndex(type); 
        this._equipments[index] = equipment; // can be null
        this._stars[index] = countOfStars;
    },
    
    // Getters
    
    // Returns an object that represents the count of materiels of each type, at different levels.
    // So far, we only support level 6 and 7 materials.
    getMaterials : function() {
        var materials = {
            lv6 : [0,0,0,0,0,0,0,0,0,0,0,0],
            lv7 : [0,0,0,0,0,0,0,0,0,0,0,0]  
        };
        
        for (equipment of this._equipments) {
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
                    var index = this._toMaterialIndex(c.name);
                    if (index >= 0 // Name recognized
                        && !isNaN(c.quantity)) { // Quantity is a number
                        mats[index] += c.quantity;
                    }
                }
            }
        }
        
        return materials;
    },
    
    // Returns a buffs object that contains buff value for each of 12 buff categories (G/M/R/S * A/D/HP).
    getBuffs : function(scenario, starring) {
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
                    continue;
                }
            
                // In-city attribute only takes effect when defending the city.
                var isInCity = findCond(conditions, "in-city");
                if (isInCity && !isDefending) {
                    continue;
                }
               
                // Marching attribute doesn't take effect when defending own city or reinforcing others' city (?). 
                var isMarching = findCond(conditions, "marching");
                if (isMarching && (isDefending || isReinforcing)) {
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
                    var eqIndex = this._toEquipmentIndex(type); 
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
}

const buffNumShades = [
    "#52be80",
    "#27ae60",
    "#229954",
    "#1e8449",
    "#196f3d",
    "#145a32",
];

const buffRanges = buffNumShades.length - 1;
const buffRangeSize = 20;
const debuffRangeSize = 20;

// Set buff number to a buff column. Apply color and font weight accordingly.
function updateBuffColumn(buffCols, index, value){
    var col = buffCols[index];
    col.textContent = value + "%";
    if (value < 0) {
        value = -value;
    }
    
    var color = (index >= 3 && index <=5 ||  index >= 9 && index <= 11) ? "#d0d0d0" : "#f0f0f0";
    if (value > 0) {
        var range = Math.floor(value / buffRangeSize);
        if (range > buffRanges) {
            range = buffRanges;
        }
        
        color = buffNumShades[range];
    }
    
    col.style.color = color;
    if (range == buffRanges) {
        col.style.fontWeight = "bold";
    }
}

function updateBuffTable(buffs, isBuffOrDebuff) {
    var buffCols = $("#" + (isBuffOrDebuff ? "buff" : "debuff") + "-row td")
    
    updateBuffColumn(buffCols, 0, buffs.groundAttack);
    updateBuffColumn(buffCols, 1, buffs.groundDefense);
    updateBuffColumn(buffCols, 2, buffs.groundHp);
    updateBuffColumn(buffCols, 3, buffs.mountedAttack);
    updateBuffColumn(buffCols, 4, buffs.mountedDefense);
    updateBuffColumn(buffCols, 5, buffs.mountedHp);
    updateBuffColumn(buffCols, 6, buffs.rangedAttack);
    updateBuffColumn(buffCols, 7, buffs.rangedDefense);
    updateBuffColumn(buffCols, 8, buffs.rangedHp);
    updateBuffColumn(buffCols, 9, buffs.siegeAttack);
    updateBuffColumn(buffCols,10, buffs.siegeDefense);
    updateBuffColumn(buffCols,11, buffs.siegeHp);
}

function updateMaterialTable(materials) {
    updateMaterialRow(6, materials.lv6);
    updateMaterialRow(7, materials.lv7);
}

function updateMaterialRow(lvl, mats){
    var row = findMaterialRow(lvl);
    row.each(function(index){
        var count = mats[index];
        $(this).text(count);
    });
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
    var materials = general.getMaterials();
    updateMaterialTable(materials);
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
    
        configureUI(false);
        
        $(window).resize(function() {
            configureUI(true);
        });
    
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

function configureUI(reposOnly){
    var windowWidth = document.documentElement.clientWidth;
    var windowHeight = document.documentElement.clientHeight;
    var orgPicWidth = 670; // Check the picture's dimension.
    var orgPicHeight = 664;
    var picWidth = orgPicWidth;
    var picHeight = orgPicHeight;    
    if (windowWidth < picWidth) {
        // Picture got resized due to a smaller window.
        picWidth = windowWidth;
        picHeight = picWidth *  orgPicHeight / orgPicWidth;
    }
    
    var topLeftX = windowWidth / 2 - picWidth / 2;
    // console.log("Window size: " + windowWidth + " * " + windowHeight);
    // console.log("Picture size: " + picWidth + " * " + picHeight);
    // console.log("Picture positioned at: " + topLeftX);
    
    var picLoc = {
        topLeftX : topLeftX,
        picWidth : picWidth,
        picHeight : picHeight,
        windowWidth : windowWidth,
        windowHeight : windowHeight
    };
    
    enableEquipmentDropDownMenu("weapon", picLoc, reposOnly);
    enableEquipmentDropDownMenu("armor", picLoc, reposOnly);
    enableEquipmentDropDownMenu("boots", picLoc, reposOnly);
    enableEquipmentDropDownMenu("helmet", picLoc, reposOnly);
    enableEquipmentDropDownMenu("legarmor", picLoc, reposOnly);
    enableEquipmentDropDownMenu("ring", picLoc, reposOnly);
    
    if (!reposOnly){
        configureBattleTypeSelector();
    }
}

const starIcon = "★";
const nonStarIcon = "☆";
        
function enableEquipmentDropDownMenu(type, picLoc, reposOnly) {
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
    
    function setLocation(selector, type, picLoc) {
        if (!(!!selector || !!type || !!picLoc)) {
            console.warn(
                "Unable to set location for the selector. The type, or the picture, or the selector itself, is missing.");
            return;
        }
        
        var topLeftX = picLoc.topLeftX;
        var topLeftY = 0;
        var width = picLoc.picWidth;
        var height = picLoc.picHeight;
        
        const leftBase = 0.18;
        const rightBase = 0.84;
        var top = 0;
        var left = 0;
        switch(type){
        case "weapon":
            top = topLeftY + height * 0.26;
            left = topLeftX + width * (leftBase - 0.02);
            break;
        case "armor":
            top = topLeftY + height * 0.46;
            left = topLeftX + width * leftBase;
            break;
        case "boots":
            top = topLeftY + height * 0.66;
            left = topLeftX + width * leftBase;
            break;
        case "helmet":
            top = topLeftY + height * 0.26;
            left = topLeftX + width * rightBase;
            break;
        case "legarmor":
            top = topLeftY + height * 0.46;
            left = topLeftX + width * rightBase;
            break;
        case "ring":
            top = topLeftY + height * 0.66;
            left = topLeftX + width * rightBase;
            break;
        }
        
        var topRatio = top * 100 / picLoc.windowHeight;
        var leftRatio = left * 100 / picLoc.windowWidth;
        
        var topPt = Math.floor(topRatio) + "%";
        var leftPt = Math.floor(leftRatio) + "%";
        
        console.info("Set postion for " + type + " - left: " + leftPt + "; top: " + topPt);
        
        selector.css("top", topPt);
        selector.css("left", leftPt);
    }
    
    // Reposition its container
    var scon = findSelector(type);
    setLocation(scon, type, picLoc);
    if (!!reposOnly) {
        return;
    }
    
    // Enable the selector
    var selector = findDropdown(type);
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
        
        logChange(!!eq ? eq.name : "", count);
        
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
    return $("#selector-" + type);
}

function findDropdown(type){
    return $("#selector-" + type + " select");
}

function findStar(type){
    return $("#selector-" + type + " .star");
}

function findStatRow(type){
    return $("#" + type + "-row");
}

function findMaterialRow(level){
    return $("#material-row-" + level + " td");
}

function configureBattleTypeSelector() {
    var inputs = $("#battle-types input");
    
    /* 
      <input type="radio" id="opt-any"
        name="battle-type" value="any" checked>
     */

    inputs.each(function(){
         var input = $(this);
         
         // 1. Check "any" as the default
         var value = input.val();
        input.prop("checked", value == "any");
        
        // 2. Add event handler
        input.change(function() {
            var radBtn = $(this);
            if (radBtn.prop("checked")) {
                // New battle type selected, update stats
                var btype = radBtn.val();
                console.log("Selected new battle type: " + radBtn.val());
                updateStats();
            }
        });
     });
}

function populateEquipmentDropDownMenu(type) {
    /* Populate <select> with <option>s:
      <form class="btn" id="selector-weapon">  
         ...
         <select style="display: block;">  
           <option value = "FullName">Courageous Ares Bow</option>  
           <option value = "FullName">Courageous Achae. Bow</option>  
           <option value = "FullName">Civilization Bow</option> 
           ...
         </select>  
       </form> 
     */
     
    // Locate the selector
    var selector = findDropdown(type);
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
        // Use a simplified name, which removes the type if it's obvious.
        if (eq.type !== "weapon"){        
            var index = name.lastIndexOf(' ');
            if (index > 1){
                if (eq.type === "legarmor"){
                    index = name.lastIndexOf(' ', index - 1);
                }
                name = name.substring(0, index);
            }
        }
        
        var opt = $("<option>", { value: eq.name }).text(name);
        typEqs[eq.name] = eq;
        selector.append(opt);
        count++;
    }
    
    console.info("Populated " + count + " equipments of type " + type + ".");
    return true;
}