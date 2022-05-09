// File: general_configurator.js
//
// The GUI for general configuration
//
// URL: ?lang={ISO 639-1 2-letter language name}

// The equipment data, deserialized
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

// Internationalization
var translator = new Translator();

// The general being configured
var general = new General();

// The general in comparison
const c_maxGenerals = 4;
var generalSet = new GeneralSet(c_maxGenerals);

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

// For a given buff number, get the styling info.
function getBuffDeco(func, value){
    if (value < 0) {
        value = -value; // A debuff value
    }
    
    var range = 0;
    var color = !!func() ? "#d0d0d0" : "#f0f0f0";
    if (value > 0) {
        var range = Math.floor(value / buffRangeSize);
        if (range > buffRanges) {
            range = buffRanges;
        }
        
        color = buffNumShades[range];
    }
    
    return {
        color: color,
        isMax: range === buffRanges
    }
}

// Set buff number to a buff column. Apply color and font weight accordingly.
function updateBuffColumn(buffCols, index, value){
    var col = buffCols[index];
    col.textContent = value + "%";
    
    var deco = getBuffDeco(function(){
        return index >= 3 && index <=5 ||  index >= 9 && index <= 11;
    }, value);
    
    col.style.color = deco.color;
    if (!!deco.isMax) {
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

function getBattleType(){
    return $("input[name='battle-type']:checked").val();
}

function updateStats() {
    // 1. Get battle type
    var battleType = getBattleType();
    
    // 2. Calculate and update the buffs
    var buffs = general.getBuffs(battleType, c_starring_equipped);
    updateBuffTable(buffs, true);
    
    // 3. Calculate and update the debuffs
    var debuffs = general.getBuffs(c_scenario_debuffing, c_starring_equipped);
    updateBuffTable(debuffs, false);
    
    // 4. Materials
    var materials = general.getMaterials(true);
    updateMaterialTable(materials);
}

// Returns an object that contains:
//  - url : the part of URL until '?' (excluded)
//  - lang : the language
//  - selection : the selection of equipments
//
// The semantics of the argument values are not understood by this object.
function parseUrl(){
	function extractArg(urlParams, name, args){
		var value = urlParams.get(name);
		if (typeof value === 'string'){
			value = lang.trim().toLowerCase();
			if (value !== "") {
				args[name] = value;
			}
		}
	}

	var url = window.location.protocol + "//" + window.location.host + window.location.pathname;
	
	var urlInfo = {
		"url" : url
	};
	
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	extractArg(urlParams, "lang", args);
	extractArg(urlParams, "selection", args);
	
	return urlInfo;
}

// Load data from the server
function initialize() {
    var lang = "en";
    const fileName = "equipments.json";
    var filePath = "";
    
    // TODO: Get en-lang file -> init Translator -> init data ->  no need to translate again!
    
    // window.location.protocol + "//" + window.location.host + window.location.pathname

    var trInit = translator.initialize(true); // Let initialize() figure out the selected language from URL.
    setLangLink(trInit.lang);
    var prom = switchLangAsync(trInit, true); // skipTranslation == true. We defer translation for now since the page has yet to be populated.

    prom.then(function(){
    	return $.getJSON(filePath = "../data/" + fileName);
    })
    .then(function(data) {
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
            try {
                General.validateEquipment(equipment);
            } catch (error) {
                panic("Invalid equipment '" + equipment.name + "': " + error);
                return;
            }
            
            var s = sets[equipment.set];
            if (!!s) {
                equipment.set = s;
            } else {
                panic("Equipment " + equipment.name + "'s set '" + equipment.set + "' doesn't exist.");
                return;
            }
            
            var setBase = false;
            var bn = equipment.condition.base;
            if (!!bn) {
                var b = equipments[bn];
                if (!!b) {
                    equipment.condition.base = b;
                    setBase = true;
                } else {
                    panic("Equipment " + equipment.name + "'s base '" + bn + "' doesn't exist.");
                    return;
                }
            }
            
            if (!setBase) {
                // Sanitize this property
                equipment.condition.base = null;
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
        
        // Translate now
        switchLangAsync(trInit, trInit.lang === "en"); // But if it's English, do not translate.
    })
    .fail(function(error) {
		var status = error.status;
		if (status == 200) {
			panic("Data file " + filePath + " cannot be parsed."); 
		} else {
			panic("Data file " + filePath + " cannot be loaded. Status = " + error.status + ".");
		}
	}); 
}

function switchLangAsync(trInit, skipTranslation) {
    var dataPromise = trInit.dataPromise;
    if (!!dataPromise) {
      var lang = trInit.lang;
      var filePath = trInit.path;
      return dataPromise
        .then(function(data) {
            if (!!data) {
                if (skipTranslation === true) {
                    translator.initTranslator(data);
                } else {
                    translator.translate(data);
                    configureUI(true); // Re-adjust the layout
                }
                
                setLangLink(lang);
                console.log("Language switched.");
            }
        })
        .fail(function(error) {
            var status = error.status;
            if (status == 200) {
                panic("Data file " + filePath + " cannot be parsed."); 
            } else {
                if (filePath.endsWith("/" + lang + ".json") && status == 404) {
                    // The language is not supported.
                    console.warn("Language '" + lang + "' is unrecognized or not supported.");
                } else {
                    panic("Data file " + filePath + " cannot be loaded. Status = " + error.status + ".");
                } 
            }
        });   
    } else {
    	var def = $.Deferred();
		def.resolve(null);
    	return def;
    }
}

function setLangLink(lang){
    var dc$ = $(".dropdown-content a");
    const kw = "=" + lang;
    dc$.each(function(){
        var a$ = $(this);
        var href = a$.attr('href');
        if (href.endsWith(kw)) {
            a$.addClass('link-disabled');
            a$.css('color', 'lightblue');
        } else {
            a$.removeClass('link-disabled');
            a$.css('color', '');
        }
    });
}

function switchLang(lang) {
    if (translator.getLang() === lang) {
        return;
    }

    var trInit = translator.initialize(true, lang);
    switchLangAsync(trInit);
}

function panic(message){
    console.error("FAILED: " + message);
    
    var box = $("#panic-box");
    box.html(
        "<strong>WARNING</strong><br>"
        + message
        + "<br><span style='font-size: smaller'>Take screenshot and report to player \"Norview ★\" (ID: 135198770) from Server 803.</span>");
    box.css("display", "block");
    box.animate({"margin-top" : '-1%'}, "slow");
}

//toggleVisibility(this, 'battle-types-table')
function toggleVisibility(button, targetId) {
	var btn = $(button);
	// Such buttons contain an image inside:
	//   <image src="../assets/hide.png" />
	// We use this to also represent the state.
	var img = btn.find("img");
	var src = img.attr("src");
	var toShow = false;
	if (src.endsWith("hide.png")) {
		src = src.replace("hide.png", "show.png");
	} else if (src.endsWith("show.png")) {
		src = src.replace("show.png", "hide.png");
		toShow = true;
	} else {
		console.warn("Button doesn't contain an image for show/hide function.");
		return;
	}
	
	var tgt = $("#" + targetId);
	if (toShow) {
		tgt.css("display", ""); // Reset to the default
	} else {
		tgt.css("display", "none");
	}
	
	// Update the image only if the style change was successful.
	img.attr("src", src);
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
        stretched : stretched
    };
    
    enableEquipmentDropDownMenu("weapon", picLoc, reposOnly);
    enableEquipmentDropDownMenu("armor", picLoc, reposOnly);
    enableEquipmentDropDownMenu("boots", picLoc, reposOnly);
    enableEquipmentDropDownMenu("helmet", picLoc, reposOnly);
    enableEquipmentDropDownMenu("legarmor", picLoc, reposOnly);
    enableEquipmentDropDownMenu("ring", picLoc, reposOnly);
    
    configureAnimalCheckBox(picLoc, reposOnly);
        
    if (!reposOnly){
        configureBattleTypeSelector();
        configureCompareButton();
    }
}

const starIcon = "★";
const nonStarIcon = "☆";
 
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
    const rightBase = isStretched ? 0.78 : 0.84;
    var top = 0;
    var left = 0;
    var offsets = translator.getDropdownOffsets();
    switch(type){
    case "animal":
        top = topLeftY + height * 0.13;
        left = topLeftX + width * (leftBase - (isStretched ? 0.14 : 0.06));
        break;
    case "weapon":
        top = topLeftY + height * 0.26;
        left = topLeftX + width * (leftBase - 0.01 + offsets[0]);
        break;
    case "armor":
        top = topLeftY + height * 0.46;
        left = topLeftX + width * (leftBase + offsets[1]);
        break;
    case "boots":
        top = topLeftY + height * 0.66;
        left = topLeftX + width * (leftBase + offsets[2]);
        break;
    case "helmet":
        top = topLeftY + height * 0.26;
        left = topLeftX + width * (rightBase + offsets[3]);
        break;
    case "legarmor":
        top = topLeftY + height * 0.46;
        left = topLeftX + width * (rightBase + offsets[4]);
        break;
    case "ring":
        top = topLeftY + height * 0.66;
        left = topLeftX + width * (rightBase + offsets[5]);
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
    
    // console.info("Set position for " + type + " - left: " + leftPt + "; top: " + topPt);
    
    selector.css("top", topPt);
    selector.css("left", leftPt);
}

function makeDummyDragon(){
    return { 
        name: "generic-dragon",
        type: "dragon"
    };
}

function configureAnimalCheckBox(picLoc, reposOnly) {
    function tryUpdate(checked){
        general.setAnimal(checked ? makeDummyDragon() : null);
        // Trigger update only if any equipment is sensitive to dragon's presence (most are not).
        var eqs = general.getEquipments();
        for (var eq of eqs) {
            if (!!eq) {
                for (var attr of eq.attributes) {
                    for (var cond of attr.condition) {
                        if (cond === "w/dragon") {
                            // console.info("Found at least one equipment with buffs triggered by w/dragon.");
                            // Trigger and return
                            updateStats();
                            return;
                        }
                    } 
                }
            }
        }    
    }

    var animal$ = findSelector("animal");
    setLocation(animal$, "animal", picLoc);
    
    if (!reposOnly) {
        var cb$ = animal$.find("#animal-checkbox");
        // Reset the state
        cb$.prop('checked', false);
        
        // Clicking on the label should have the same toggling effect.
        animal$.find("label").click(function(){
            var isChecked = cb$.is(":checked");
            cb$.prop('checked', !isChecked);
            tryUpdate(checked);
        });
    
        // Clicking triggers stats update.
        cb$.change(function(){
            var checked = $(this).is(":checked");
            tryUpdate(checked);
        });
    }
}
       
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
        
    function getSetColor(setName) {
        setName = setName.trim().toLowerCase();
        switch (setName) {
        case "king": return "#fcf403";
        case "dragon": return "#fcba03";
        case "ares": return "#fc6b03";
        case "achaemenidae": return "#fc2403";
        default: // Civilization use the same color. Not ideal as they belong to different sets.
            return "#c603fc";
        }
    }
    
    function updateSets() {
        // Collect pieces by set
        var map = new Map();
        for (var eq of general.getEquipments()) {
            if (!!eq) {
                var setName = eq.set.name;
                if (!map.has(setName)) {
                    map.set(setName, []);
                }
                
                map.get(setName).push(eq);
            }
        }
        
        var allTypes = new Set();
        allTypes.add("weapon");
        allTypes.add("armor");
        allTypes.add("boots");
        allTypes.add("helmet");
        allTypes.add("legarmor");
        allTypes.add("ring");
        
        map.forEach(function(value, key) {
            if (!!value && value.length >= 2) {
                // Minimal set requirement met
                var color = getSetColor(key);
                for (var eq of value) {
                    var type = eq.type;
                    var selector = findSelector(type);
                    selector.css("border", "2px solid " + color + "");
                    allTypes.delete(type);
                }
            }
        });
        
        allTypes.forEach(function(value) {
            // Minimal set requirement not met
            var selector = findSelector(value);
            selector.css("border", "2px solid blue");
        });
    }
    
    // Reposition its container
    var scon = findSelector(type);
    setLocation(scon, type, picLoc);
    
    // Reposition the "Compare" button
    if (type === "ring") {
        var compBtn = findCompareButton();
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
        
        tryEnableCompareButton(general);
        
        updateStats();
        
        updateSets();
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

// The "Compare" button

function disableCompareButton(btn){
    btn.attr("disabled", true);
    btn.css("background-color", "grey");
    btn.css("color", "#d0d0d0");
    btn.find("img").attr("src", "../assets/add_disabled.png");
}

function enableCompareButton(btn){
    btn.attr("disabled", false);
    btn.css("background-color", "");
    btn.css("color", "");
    btn.find("img").attr("src", "../assets/add.png");
}

function configureCompareButton(){
    var compBtn = findCompareButton();
    disableCompareButton(compBtn);
    compBtn.click(function(){
        addGeneral(general);
        disableCompareButton(compBtn);
    });
}

// UI component finders

function findCompareButton(){
    return $("#add-to-comparison-form button");
}

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
                updateGenerals();
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
        // First check the set's designated order
        var diff = e1.set.order - e2.set.order;
        if (diff !== 0) {
            return diff;
        }
        
        // Then alphabetically
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
        var langKeyValue = translator.getDisplayName(eq, c_name_dropdown);
        
        var opt = $("<option>", { "value": eq.name, "class": "i18n", "tkey": langKeyValue.key }).text(langKeyValue.initial);
        typEqs[eq.name] = eq;
        selector.append(opt);
        count++;
    }
    
    console.info("Populated " + count + " equipments of type " + type + ".");
    return true;
}

/////// Comparison Table ///////

var ctable = null;

// Enable "Compare" button if 
// (1) we have at least one piece of equipment.
// (2) the combination is not found in the set.
// Otherwise, disable it instead.
function tryEnableCompareButton(general){
    var equipped = false;
    var eqs = general.getEquipments();
    for (var eq of eqs) {
        if (!!eq) {
            equipped = true;
            break;
        }
    }

    var compBtn = findCompareButton();
    if (equipped && !generalSet.has(general)){
        enableCompareButton(compBtn);
    } else {
        disableCompareButton(compBtn);
    }
}

function addGeneral(general){
    // Create and insert a replica. Through the end we should only refer to the replica.
    var generalRep = general.clone();
    
    // Set a dummy dragon. In this table we always compare with a dragin included.
    generalRep.setAnimal(makeDummyDragon());
    
    var succ = generalSet.add(generalRep);
    
    if (succ) {
        if (ctable == null) {
            // Initialize the table
            ctable = new ComparisonTable();
        }
        
        var battleType = getBattleType();
         
        // This unfortunately doesn't cover the case when the last slot is filled.
        var genCount = generalSet.getAll().length;
        var appendOnly = genCount < c_maxGenerals;
        if (appendOnly) {
            ctable.append(generalRep, battleType);
            console.info("Appended general to the comparison table.");
        } else {
            ctable.clearAll();
            var generals = generalSet.getAll();
            for (var gen of generals) {
                ctable.append(gen, battleType);
            }
            
            console.info("Refreshed all generals in the comparison table.");
        }
        
        if (genCount === 1) {
            // This is the first one, let's display the view parts.
            var view = $(".comparison-component");
            view.css("display", "");
        }
    }
}

function removeGeneral(index, general) {
    if (!ctable) {
        return;
    }
    
    var succ = generalSet.removeExact(general);
    if (succ) {
        ctable.remove(index);
    }
    
    var genCount = generalSet.getAll().length;
    if (genCount < 1) {
        // That was the last one, let's hide the view parts.
        var view = $(".comparison-component");
        view.css("display", "none");
    }
    
    tryEnableCompareButton(window.general);
}

function updateGenerals(){
    if (!ctable) {
        return;
    }
    
    var battleType = getBattleType();
    ctable.updateAll(battleType);
}

const c_comparison_table = "#comparison-table";
const c_comparison_table_delete_row = "#ct-delete-row";

const entry_class = ".ctentry";
const _entry_index_class_prefix = "ctentry-";
const entry_index_class_prefix = "." + _entry_index_class_prefix;
const c_buff_row_id_prefix = "ct-buff-";
const c_debuff_row_id_prefix = "ct-debuff-";

const c_data_general_obj = "data_general";
const c_data_index_num = "data_index";

function ComparisonTable(){

    // Locate all the display rows and cache them.
    //   - 1 delete button
    //   - 6 equipments
    //   - 12 buff values
    //   - 12 debuff values
    function initialize(){
        var equipments = [];
        var buffs = [];
        var debuffs = [];
        var deleteRow = null;
        var rows = $(c_comparison_table + " tr");
        if (!!rows){
            rows.each(function(){
                var child = $(this);
                var id = child.attr("id");
                if (!!id){
                    if (id.startsWith("ct-equipment-")) {
                        equipments.push(child);
                    } else if (id.startsWith(c_buff_row_id_prefix)) {
                        buffs.push(child);
                    } else if (id.startsWith(c_debuff_row_id_prefix)) {
                        debuffs.push(child);
                    } else if (id === "ct-delete-row") {
                        deleteRow = child;
                    }
                }
            });
        }
    
        if (buffs.length != 12) {
            console.warn("Located " + buffs.length + " buff rows in the comparison table instead 12.");
        }
        if (debuffs.length != 12) {
            console.warn("Located " + debuffs.length + " debuff rows in the comparison table instead 12.");
        }
        if (equipments.length != 6) {
            console.warn("Located " + debuffs.length + " equipment rows in the comparison table instead 6.");
        }
        if (!deleteRow) {
            console.warn("Couldn't locate the delete row in the comparison table.");
        }
    
        return {
            equipments : equipments,
            buffs : buffs,
            debuffs : debuffs,
            deleteRow : deleteRow
        };
    }
    
    // Returns the info on the buff that should be put into the given row
    //  - buffRow has an id of ct-(de)buff-{buffType}-row
    //  - buffs has a property of name {buffType}
    // So this function is able to find the property corresponding to this row.
    function getBuffInfoForRow(buffRow, buffs, isBuff){
        var offset = isBuff ? c_buff_row_id_prefix.length : c_debuff_row_id_prefix.length;
        var id = buffRow.attr("id");
        // Example: ct-buff-groundAttack-row
        // Note the part in the middle is same as the property name in buff object
        var idPart = id.substring(offset); // remove the prefix
        idPart = idPart.substring(0, idPart.length - 4); // remove the suffix ("-row")
        var val = buffs[idPart];
        if (isNaN(val)){
            val = 0;        
            if (!idPart){
                idPart = "";
            }
        }

        return {
            value : val,
            type : idPart
        };
    }
    
    // Populate the column for (de)buff properties
    function addBuffs(buffRows, isBuff, buffs, index){
        for (var buffRow of buffRows) {
            var buffVal = getBuffInfoForRow(buffRow, buffs, isBuff);
            
            var isGrey = buffVal.type.startsWith("mounted") || buffVal.type.startsWith("siege");
            var bgColor = isGrey ? "grey " : "";
            var value = buffVal.value;
            var valStr = value + "%";
            // Example:
            // <td class="ctentry ctentry-0">15%</td>
            var td = $("<td class=\"" + bgColor + "ctentry ctentry-" + index + "\">" + valStr + "</td>");

             var deco = getBuffDeco(function(){
                return isGrey;
            }, value);
    
            td.css("color", deco.color);
            if (!!deco.isMax) {
                td.css("fontWeight");
            }
            
            buffRow.append(td);
        }
    }
    
    function updateBuffs(buffRows, columns, isBuff) {
        var propName = isBuff ? "buffs" : "debuffs";
        // Update per row
        for (var buffRow of buffRows) {
            var tds = buffRow.find(entry_class);
            tds.each(function(_index){
                var td = $(this);
                var column = columns[_index];
                
                // Update the value
                var buffs = column[propName];
                var buffVal = getBuffInfoForRow(buffRow, buffs, isBuff);
                var value = buffVal.value;
                td.text(value + "%");
                
                var isGrey = buffVal.type.startsWith("mounted") || buffVal.type.startsWith("siege");
                var deco = getBuffDeco(function(){
                    return isGrey;
                }, value);
    
                td.css("color", deco.color);
                if (!!deco.isMax) {
                    td.css("fontWeight");
                }
            });
        }
    }
    
    var obj = initialize();
    
    this._equipments = obj.equipments;
    this._buffs = obj.buffs;
    this._debuffs = obj.debuffs;
    this._deleteRow = obj.deleteRow;
    this._index = -1;
    
    this.updateAll = function(scenario) {
        var delHeaders = this._deleteRow.find(entry_class);
        // var delHeaders = $(c_comparison_table_delete_row + " " + entry_class);
        
        // Each contains the index of the column and the buffs objects
        var columns = [];
        
        // Locate each general on the row
        delHeaders.each(function(){
            var header = $(this);
            var general = header.data(c_data_general_obj);
            
            columns.push({
                // index: index,
                buffs: general.getBuffs(scenario, c_starring_max),
                debuffs: general.getDebuffs(scenario, c_starring_max)
            });
        });
        
        // Update
        updateBuffs(this._buffs, columns, true);
        updateBuffs(this._debuffs, columns, false);
    };
    
    this.clearAll = function() {
        if (!!this._deleteRow){
             var entries = this._deleteRow.find(entry_class);
            entries.remove();
        }
        for (var row of this._equipments) {
            var entries = row.find(entry_class);
            entries.remove();
        }
        for (var row of this._buffs) {
            var entries = row.find(entry_class);
            entries.remove();
        }
        for (var row of this._debuffs) {
            var entries = row.find(entry_class);
            entries.remove();
        }
        
        this._index = -1;
    };
    
    this.remove = function(index){
        var cells = $(c_comparison_table + " " + entry_index_class_prefix + index);
        cells.remove();
        
        // No need to update index for the following columns. Their event handlers 
        // will still work, as they keep referring to the original index.
    };
    
    this.append = function(general, scenario){
        // Add the entry at the next index
        this._index++;
        var index = this._index;
        
        // 1. Add delete button, which is also used as the data bearer.
        if (!!this._deleteRow) {
            // Example:
            // <th class="ctentry ctentry-0"><image src="./assets/delete.png" style="width:24px"></th>
            var btn = $("<th class=\"ctentry ctentry-" + index + "\"><image src=\"./assets/delete.png\" style=\"width:24px\"></th>");
             this._deleteRow.append(btn);
             
             // Add handler
             btn.click(function(){
                removeGeneral(index, general);
            });
            
            // Attach the metadata
            btn.data(c_data_general_obj, general);
            // btn.data(c_data_index_num, index);
        }
        
        // 2. Add equipment names
        var eqs = general.getEquipments();
        for (var i = 0; i < 6; i++) {
            // Example:
            // <th class="ctentry ctentry-0">Achae.</th>
            var eq = eqs[i];
            var row = this._equipments[i];
            if (!!row){
                var keyAndName = translator.getDisplayName(eq, c_name_minimal);                
                var th = $("<th class=\"i18n ctentry ctentry-" + index + "\" tkey=\"" + keyAndName.key + "\">" + keyAndName.initial + "</th>");
                row.append(th);
            }
        }
        
        // 3. Add buffs
        var buffs = general.getBuffs(scenario, c_starring_max);
        addBuffs(this._buffs, true, buffs, index);
        
        var debuffs = general.getDebuffs(scenario, c_starring_max);
        addBuffs(this._debuffs, false, debuffs, index);
    };
}
