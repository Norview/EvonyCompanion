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

// The general being configured
var general = new General();

// The general in comparison
var generals = [];

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
    
    // In .css file, we stretch this picture to 150% on smaller devices.
    var stretched = windowWidth <= 1024;
    if (stretched) {
    	orgPicWidth *= 1.5;
    	orgPicHeight *= 1.5;
    }
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
        windowHeight : windowHeight,
        stretched: stretched
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
        var isStretched = !!picLoc.stretched;
        
        const leftBase = isStretched ? 0.23 : 0.18;
        const rightBase = isStretched ? 0.82 : 0.84;
        var top = 0;
        var left = 0;
        switch(type){
        case "weapon":
            top = topLeftY + height * 0.26;
            left = topLeftX + width * (leftBase - (isStretched ? 0.04 : 0.03));
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
        case "compare":
            top = topLeftY + height * 0.81;
            left = topLeftX + width * (rightBase + (isStretched ? 0.125 : 0.035));
            break;
        }
        
        var topRatio = top * 100 / picLoc.windowHeight;
        var leftRatio = left * 100 / picLoc.windowWidth;
        
        var topPt = Math.floor(topRatio) + "%";
        var leftPt = Math.floor(leftRatio) + "%";
        
        console.info("Set postion for " + type + " - left: " + leftPt + "; top: " + topPt);
        
        selector.css("top", topPt);
        selector.css("left", leftPt);
        
        // if (isStretched) {
        //	selector.find("option").css("font-size", "28px");
        // }
    }
    
    // Reposition its container
    var scon = findSelector(type);
    setLocation(scon, type, picLoc);
    
    // Reposition the "Compare" button
    if (type === "ring") {
    	var compBtn = $("#add-to-comparison-form button");
    	setLocation(compBtn, "compare", picLoc);
    }
    
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