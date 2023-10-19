// File: general_configurator.js
//
// The GUI for general configuration
//
// URL: ?lang={ISO 639-1 2-letter language name}

////////////////// Constants //////////////////

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

const starIcon = "★";
const nonStarIcon = "☆";

const grayPng = "gray_v2.png";

////////////////// Globals //////////////////

// The equipment data, deserialized
var equipments = null;
var sets = null;

// Internationalization
var translator = new Translator();

// The general being configured
var general = new General();

// The generals in comparison
var suitTable;

// Equipment inventory
var inventory;

// Refine estimator
var refiner;

////////////////// Functions //////////////////

function getBattleType(){
    return $("input[name='battle-type']:checked").val();
}

// For a given buff number, get the styling info.
var getBuffDeco = (function(){
    const buffNumShades = [
        "#019a60",
        "#008a57",
        "#007b4d",
        "#006b44",
        "#005c3b",
        "#004d32"
    ];

    const debuffNumShades = [
        "#f62e30",
        "#dd292a",
        "#c42417",
        "#ac2022",
        "#931b1e",
        "#7b171a"
    ];

    const buffRanges = buffNumShades.length - 1;
    const buffRangeSize = 20;
    const debuffRanges = debuffNumShades.length - 1;
    const debuffRangeSize = 15;
    
    return function(func, value){
        var shades = buffNumShades;
        var rangeSize = buffRangeSize;
        var ranges = buffRanges;
        if (value < 0) {
            // A debuff value
            value = -value; 
            shades = debuffNumShades;
            rangeSize = debuffRangeSize;
            ranges = debuffRanges;
        }

        var range = 0;
        var color = !!func() ? "#d0d0d0" : "#f0f0f0";
        if (value > 0) {
            var range = Math.floor(value / rangeSize);
            if (range > ranges) {
                range = ranges;
            }
    
            color = shades[range];
        }

        return {
            color: color,
            isMax: range === buffRanges
        }
    }
})();

// Entrance
function initialize() {
    function selectEquipmentFromDropDownMenu(eqType, eqName) {
        // Locate the selector => options
        var selector = findDropdown(eqType);
        var options = selector.find("option");

        if (!!eqName) {
            // Find the one corresponding to the given equipment
            for (let opt of options) {
                if (opt.value == eqName) {
                    opt.selected = true;
                    break;
                }
            }
        } else {
            // Reset the selection
            for (let opt of options) {
                if (opt.selected) {
                    opt.selected = false;
                }
            }
        }

        // Trigger a change event
        selector.trigger("change");
    }

    function updateStats() {
        // Set buff number to a buff column. Apply color and font weight accordingly.
        function updateBuffColumn(buffCols, index, value, breakdown){
            var col = buffCols[index];
            col.textContent = value + "%";
    
            var deco = getBuffDeco(function(){
                return index >= 3 && index <=5 ||  index >= 9 && index <= 11;
            }, value);
    
            col.style.color = deco.color;
            if (!!deco.isMax) {
                col.style.fontWeight = "bold";
            }
    
            // Add a tooltip to show the buff contribution by equipments
            var tip = $("<div class='tooltip-div'>");
    
            for (var buffEntry of breakdown) {
                var tipRow = $("<div>");
                var srcName = buffEntry.name;
                var buff = buffEntry.value;
                var extraStyle = (buffEntry.type === "set" ? " style='font-weight: bold;'" : ""); // set buff is shown in bold
        
                let color = (buff >= 0 ? "green" : "red");
                let sign = (buff >= 0 ? "+" : "");
        
                let name = translator.translateByKey(srcName);
                let spNameSrc = $("<span class='i18n'" + extraStyle + " tkey='" + srcName + "'>" + name + " : &nbsp;</span>");
                let spName = $(spNameSrc);
                tipRow.append(spName);
        
                let spValueSrc = "<span style='color: " + color + "'>" + sign + buff + "%</span>";
                let spValue = $(spValueSrc);
                tipRow.append(spValue);
        
                tip.append(tipRow);
            }

            if (tip.children().length > 0) {
                $(col).tooltip({
                  position: {
                    my: "center top+5",
                    at: "center bottom"
                  },
                  content: tip
                });
            }
        }

        function updateBuffTable(buffs, diag, isBuffOrDebuff) {
            var buffCols = $("#" + (isBuffOrDebuff ? "buff" : "debuff") + "-row td")
    
            updateBuffColumn(buffCols, 0, buffs.groundAttack,  diag.groundAttack);
            updateBuffColumn(buffCols, 1, buffs.groundDefense, diag.groundDefense);
            updateBuffColumn(buffCols, 2, buffs.groundHp,      diag.groundHp);
            updateBuffColumn(buffCols, 3, buffs.mountedAttack, diag.mountedAttack);
            updateBuffColumn(buffCols, 4, buffs.mountedDefense,diag.mountedDefense);
            updateBuffColumn(buffCols, 5, buffs.mountedHp,     diag.mountedHp);
            updateBuffColumn(buffCols, 6, buffs.rangedAttack,  diag.rangedAttack);
            updateBuffColumn(buffCols, 7, buffs.rangedDefense, diag.rangedDefense);
            updateBuffColumn(buffCols, 8, buffs.rangedHp,      diag.rangedHp);
            updateBuffColumn(buffCols, 9, buffs.siegeAttack,   diag.siegeAttack);
            updateBuffColumn(buffCols,10, buffs.siegeDefense,  diag.siegeDefense);
            updateBuffColumn(buffCols,11, buffs.siegeHp,       diag.siegeHp);
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

        // 1. Get battle type
        var battleType = getBattleType();
    
        // 2. Get refined buffs
        var refineBuffs = refiner.getBuffs(general);
    
        // 3. Get inherent buffs
        var buffsFromEqs = general.getBuffs(battleType, c_starring_equipped, true);
        var buffs = buffsFromEqs.buffs;
        var diag = buffsFromEqs.diagnostics;
    
        // 4. Merge with refines
        for (var prop in refineBuffs) {
            buffs[prop] += (refineBuffs[prop] || 0);
        }
    
        // 5. Apply the buffs
        updateBuffTable(buffs, diag, true);
    
        // 6. Apply the debuffs
        var debuffsFromEqs = general.getDebuffs(c_starring_equipped, true);
        var debuffs = debuffsFromEqs.buffs;
        var diag = debuffsFromEqs.diagnostics;
        updateBuffTable(debuffs, diag, false);
    
        // 7. Materials
        var materials = general.getMaterials(true);
        updateMaterialTable(materials);
    }

    // Initialization

    function loadUI(filteredNames){
        function populateEquipmentDropDownMenu(type, filteredNames) {
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
                     if (!filteredNames || filteredNames.has(eqName)){     
                      var eq = equipments[eqName];
                      if (!!eq && eq.type === type){
                          eqs.push(eq);
                      }
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
    
            // Clear the menu since we may reload
            selector.empty();

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

        var result = true;
        _foreachEqType(function(eqType) {
            result &&= populateEquipmentDropDownMenu(eqType, filteredNames);
        });
        return result;
    }

    function configureUI(reposOnly){ 
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
            const leftBase = isStretched ? 0.21 : 0.18;
            const rightBase = isStretched ? 0.8 : 0.84;
    
            var top = 0;
            var left = 0;
    
            switch(type){
            case "animal":
                top = topLeftY + height * 0.13;
                left = topLeftX + width * (leftBase - (isStretched ? 0.11 : 0.06));
                break;
            case "weapon":
                top = topLeftY + height * (isStretched ? 0.3 : 0.26);
                left = topLeftX + width * leftBase;
                break;
            case "armor":
                top = topLeftY + height * (isStretched ? 0.55 : 0.46);
                left = topLeftX + width * leftBase;
                break;
            case "boots":
                top = topLeftY + height * (isStretched ? 0.8 : 0.66);
                left = topLeftX + width * leftBase;
                break;
            case "helmet":
                top = topLeftY + height * (isStretched ? 0.3 : 0.26);
                left = topLeftX + width * rightBase;
                break;
            case "legarmor":
                top = topLeftY + height * (isStretched ? 0.55 : 0.46);
                left = topLeftX + width * rightBase;
                break;
            case "ring":
                top = topLeftY + height * (isStretched ? 0.8 : 0.66);
                left = topLeftX + width * rightBase;
                break;
            case "compare":
                top = topLeftY + height * (isStretched ? 0.93 : 0.81);
                left = topLeftX + width * (rightBase + (isStretched ? 0.05 : -0.15));
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

            // Valid index >= 0
            function _toIndex(name) {
                switch(name){
                case "ground":
                case "attack": return 0; 
                case "mounted":
                case "defense": return 1; 
                case "ranged":
                case "hp": return 2;     
                case "siege": return 3; 
                default: return -1;        
                }
            }
    
            // Inverse of _toIndex for buff type.
            function _buffTypeFromIndex(index) {
                switch(index){
                case 0: return "attack";
                case 1: return "defense";
                case 2: return "hp";
                default: return -1;        
                }
            }
    
            // Call the given function for each troop icon.
            // func(troopIcon$, troopTypeStr)
            function _foreachTroopIcon($troops, func) {
                $troops.each(function() {
                    var troop$ = $(this);
                    if (troop$.hasClass("ground")) {
                        func(troop$, "ground");
                    } else if (troop$.hasClass("mounted")) {
                        func(troop$, "mounted");
                    } else if (troop$.hasClass("ranged")) {
                        func(troop$, "ranged");
                    } else if (troop$.hasClass("siege")) {
                        func(troop$, "siege");
                    }
                });
            }

            // A function to find the equipment of the given type (eqType) that can achieve the maximum
            // buffs for a certain troop type (troopType), with the currently specified battle type.
            function getFunctionForMaxBuffs(eqType, troopType) {
                var gen = new General();
                // These numbers are pretty subjective. May change in the future.
                const ratios = troopType === "ground" 
                    ? [2,2,2]       // Ground: equally treat A/D/H
                    : (troopType === "mounted" 
                        ? [3,1,2]   // Mounted: favor A over D
                        : [4,1,1]); // Ranged/Siege: heavily favor A
        
                return function() {
                    var selector = findDropdown(eqType);
            
                    var scenario = getBattleType();
            
                    // var eqs = [];
            
                    var typEqs = selector.data(c_data_equipment);
                    var value = 0;
                    var selectedEq = null;
                    for (var eqName in typEqs) {
                        var eq = typEqs[eqName];
                
                        gen.reset();
                        gen.setEquipment(eqType, eq, 0);
                        var buffs = gen.getBuffs(scenario, c_starring_max, false).buffs; // no diagnostics
                        var newValue = ratios[0] * buffs[troopType + "Attack"] 
                                     + ratios[1] * buffs[troopType + "Defense"] 
                                     + ratios[2] * buffs[troopType + "Hp"];
                        // Plus a refine up to 80%
                        newValue += RefineEstimator.getRefinePercentage(eq, 80);
                
                        if (newValue > value) {
                            // if (value != 0) {
                            //    eqs.push({ "name": eq.name, "buff": value });
                            // }
                    
                            value = newValue;
                            selectedEq = eq;
                        }
                    }
            
                    /*
                    console.info("To get max buff at " + eqType + ", selected " + selectedEq.name + " with " + value + "%");
                    console.info("Other candidates:");
                    for (let eq of eqs) {
                        console.info("  - " + eq.name + ": " + eq.buff + "%");
                    }
                    */
            
                    return selectedEq;
                };
            }
         
            // This function decorates the troop icons above the dropdown to visualize the specialized strength of the selected equipment.
            function updateEquipmentTraits(troops, eq, eqType){
                if (!eq) {
                    // Reset all icons.
                    _foreachTroopIcon(troops, function(troop$, trType){
                        undecorateTroopIcon(troop$, trType, eqType);
                    });
            
                    return;
                }
    
                var cachedTraits = eq.traits;
                if (!cachedTraits) {
                    /*
                        "attributes": [{
                        "condition": [],
                        "troop": ["ground"],
                        "type": "defense",
                        "value": 17,
                        "rate": 1
                    },
                    */
                    var buffs = [0,0,0,0]; // G,M,R,S
                    var perTypes = {     // A,D,HP          // A,D,HP
                        "ground": {"buff": [0,0,0], "debuff": [0,0,0]},
                        "mounted":{"buff": [0,0,0], "debuff": [0,0,0]},
                        "ranged": {"buff": [0,0,0], "debuff": [0,0,0]},
                        "siege":  {"buff": [0,0,0], "debuff": [0,0,0]}
                    };
                    for (attr of eq.attributes) {
                        var atype = attr.type;
                        var val = Math.floor(attr.value + attr.rate * 5);
                
                        // Disregard debuff
                        if (attr.rate < 0){
                            for (troop of attr.troop) {
                                let attrTypInd = _toIndex(atype);
                                if (attrTypInd >= 0) {
                                    perTypes[troop]["debuff"][attrTypInd] += val;
                                }
                            }
                    
                            continue;
                        }

                        // Disregard in-city
                        var valid = true;
                        for (cond of attr.condition) {
                            if (cond === "in-city") {
                                valid = false;
                                break;
                            }
                        }
                        if (!valid){
                            continue;
                        }
            
                        // Disregard irrelevant attributes
                        var isRangeBonus = (atype === "range");
                        var _ind = _toIndex(atype);
                        if (!(_ind >= 0 || isRangeBonus)){
                            continue;
                        }
            
                        // Gather the buff value;
                        for (troop of attr.troop) {
                            let tindex = _toIndex(troop);
                            if (troop === "siege") {
                                buffs[tindex] += val * (isRangeBonus ? 3 : 1); // Siege range is highly valued.
                            } else {
                                buffs[tindex] += val;
                            }
                        }
                
                        if (!isRangeBonus) {
                            let attrTypInd = _toIndex(atype);
                            perTypes[troop]["buff"][attrTypInd] += val;
                        }
                    }
        
                    var agg = buffs[0] + buffs[1] + buffs[2] + buffs[3];
                    var aggs = [0,0,0,0]; // G,M,R,S
                    if (agg > 0) {
                        for (var index = 0; index <= 3; index++) {
                            var percent = Math.floor(buffs[index] * 100 / agg);
                            aggs[index] = percent;
                        }
                    }
            
                    // Memoize
                    cachedTraits = eq.traits = {
                        "aggs" : aggs,
                        "perTypes" : perTypes
                    };
                }
        
                // Decorate icons according to the traits
                _foreachTroopIcon(troops, function(troop$, trType){
                    decorateTroopIcon(troop$, trType, cachedTraits);
                });
            }
    
            function undecorateTroopIcon(troop$, trType, eqType){    
                // 1. Remove the tooltip
                if (troop$.slider("instance") != undefined){
                    troop$.tooltip("destroy"); // https://api.jqueryui.com/tooltip/#method-destroy
                }
        
                // 2. Remove the border
                if (troop$.attr("src").indexOf(grayPng) > 0) {
                    troop$.attr("src", "./assets/" + trType + ".png");
                }
        
                troop$.css("border", "1px solid white");
        
                // 3. Install the function to get the equipment with the highest buff
                var getPieceWithMaxBuffs = getFunctionForMaxBuffs(eqType, trType);
                troop$.click(function() {
                    var eq = getPieceWithMaxBuffs();
                    if (!!eq) {
                        selectEquipmentFromDropDownMenu(eq.type, eq.name);
                    }
                });
            }
    
            function decorateTroopIcon(troop$, ttype, traits){
                // 1. Uninstall the function to get the equipment with the highest buff.
                troop$.off('click');
        
                // 2. Tooltip contains the buffs and defuffs for this particular troop type.
    
                var trait = traits["aggs"][_toIndex(ttype)]
        
                var typeTraits = traits.perTypes[ttype];
                var tip = $("<div class='tooltip-div' style='font-family: monospace;'>");
        
                var typeBuffs = typeTraits.buff;
                var topRow = $("<div>");
                for (let tbInd in typeBuffs) {
                    if (topRow.children().length > 0) {
                        let splitter = $("<span>/</span>");
                        topRow.append(splitter);
                    }
                    let tb = typeBuffs[tbInd];
                    let fcolor = (tb === 0 ? "#D3D3D3" : "green");
                    let buffName = _buffTypeFromIndex(parseInt(tbInd));
                    let tbSpanSrc = "<span style='color: " + fcolor + "'>" + buffName[0].toUpperCase() + "+" + tb + "%</span>";
                    let tbSpan = $(tbSpanSrc);
                    topRow.append(tbSpan);
                }

                var typeDebuffs = typeTraits.debuff;
                var btmRow = $("<div>");
                for (let tbInd in typeDebuffs) {
                    if (btmRow.children().length > 0) {
                        let splitter = $("<span>/</span>");
                        btmRow.append(splitter);
                    }
                    let tb = typeDebuffs[tbInd];
                    let fcolor = (tb === 0 ? "#D3D3D3" : "red");
                    let sign = (tb === 0 ? "-" : "");
                    let buffName = _buffTypeFromIndex(parseInt(tbInd));
                    let tbSpanSrc = "<span style='color: " + fcolor + "'>" + buffName[0].toUpperCase() + sign + tb + "%</span>";
                    let tbSpan = $(tbSpanSrc);
                    btmRow.append(tbSpan);
                }
        
                tip.append(topRow).append(btmRow);

                troop$.tooltip({
                  position: {
                     my: "center bottom-5",
                     at: "center top"
                  },
                  content: tip
                });

                // 3. Icon uses a distinct border based on the specialization for the this troop type.
                if (trait > 0) {
                    // Show the icon
                    if (troop$.attr("src").indexOf(grayPng) > 0) {
                        troop$.attr("src", "./assets/" + ttype + ".png");
                    }

                    if (trait >= 50) {
                        troop$.css("border", "1px solid red"); // Very specialized
                    } else if (trait >= 25) {
                        troop$.css("border", "1px solid gold"); // Moderately specialized
                    } else {
                        troop$.css("border", "1px solid green"); // Slightly specialized
                    }    
                } else {
                    // Hide the icon
                    if (troop$.attr("src").indexOf(grayPng) < 0) {
                        troop$.attr("src", "./assets/" + grayPng);
                    }
            
                    troop$.css("border", "1px solid black");
                }
            }
    
            function loadImage($pic, eq) {
                // Get image key of the equipment.
                var name = "eq_unselected.png";
                if (!!eq) {
                    var od = eq.set.order;
                    if (od > 40) {
                        // Civ equipment
                        // Han_Dynasty_legarmor_64x64.png
                        name = eq.set.name.replace(" ", "_") + "_" + eq.type + "_64x64.png";
                    } else if (od >= 27) {
                        // Regular red equipment
                        // courageous_dragon_boots.png_64x64.png
                        name = eq.name.replaceAll(" ", "_").toLowerCase() + "_64x64.png";
                    } else {
                        name = "eq-pic-unavailable.png";
                    }
                }
        
                // Set the new path
                var path = "../assets/equipments/" + name;
                $pic.attr("src", path);
            }
        
            // Reposition its container
            var scon = findSelector(type);
            setLocation(scon, type, picLoc);
    
            // Reposition the "Compare" button
            if (type === "ring") {
                var compBtn = findCompareControl();
                setLocation(compBtn, "compare", picLoc);
            }
    
            if (!!reposOnly) {
                return;
            }
        
            // Enable the selector
            var selector = findDropdown(type);
            selector.attr("disabled", false);
    
            // Install event handlers
            // (1) Initialize the handler for troop icons:
            //     Get the equipment from the list with the highest buffs of certain troop type.
            var $troops = findTroopImgs(type);
            _foreachTroopIcon($troops, function(troop$, trType) {
                undecorateTroopIcon(troop$, trType, type)
            });
    
            // (2) Dropdown
            selector.change(function(){ // WARNING: This function is triggered programmatically. e.g. selectEquipmentFromDropDownMenu(...)
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
        
                // load pic
                var $pic = findEquipmentImage(type);
                loadImage($pic, eq);
 
                // decorate troop icons
                // var $troops = findTroopImgs(type);
                updateEquipmentTraits($troops, eq, type);
               
                suitTable.tryEnableCompareButton(general);
        
                updateStats();
        
                updateSets();
            });
    
            // (3) Stars
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
    
        function configureBattleTypeSelector() {
            var inputs = $("#battle-types input");
    
            /* 
              <input type="radio" id="opt-any"
                name="battle-type" value="any" checked>
             */

            inputs.each(function(){
                var input = $(this);
         
                // 1. Check "attacking" as the default
                var value = input.val();
                input.prop("checked", value == "attacking");
        
                // 2. Add event handler
                input.change(function() {
                    var radBtn = $(this);
                    if (radBtn.prop("checked")) {
                        // New battle type selected, update stats
                        var btype = radBtn.val();
                        console.log("Selected new battle type: " + radBtn.val());
                        updateStats();
                        suitTable.updateGenerals();
                    }
                });
             });
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
    
        var windowWidth = document.documentElement.clientWidth;
        var windowHeight = document.documentElement.clientHeight;
        var orgPicWidth = 670; // Check the picture's dimension.
        var orgPicHeight = 664;
    
        // We stretch this picture on smaller devices.
        var stretched = windowWidth <= 1024;
        var bg_img$ = $("#general .general-image");
        if (stretched) {
            var ratio = windowWidth * 0.99 / orgPicWidth;
            orgPicWidth *= ratio;
            orgPicHeight *= ratio;
            bg_img$.css("width", ratio * 100 + "%");
        } else {
            bg_img$.css("width", "100%");
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
    
        _foreachEqType(function(eqType) {
            enableEquipmentDropDownMenu(eqType, picLoc, reposOnly);
        });
    
        configureAnimalCheckBox(picLoc, reposOnly);
        
        if (!reposOnly){
            configureBattleTypeSelector();
            suitTable.configureCompareButton();
        }
    }

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
        // All standard costs
        let presetCosts = data.costs;
        
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
            // Add costs, in the following order:
            //    Raw data as an array 
            // => from preset costs as indexed by the cost as string
            // => from preset costs as indexed by the piece's type (weapon, armor, etc.)
            let cost = equipment.cost;
            if (!Array.isArray(cost)) {
                let presetCost = presetCosts[typeof cost === 'string' ? cost : equipment.set];
                if (!!presetCost) {
                    equipment.cost = presetCost[equipment.type] || null;
                }
            }
            
            // Add default conditions for civilization equipment, if not specified explicitly
            let condition = equipment.condition;
            if (typeof condition === 'string' && condition.toLowerCase() == "civilization") {
                equipment.condition = {
                  "building": "wonder",
                  "level": 33,
                  "scroll": (equipment.name + " Scroll"),
                  "base": null
                };
            }
            
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
        
        // Initialize serializer
        GeneralSerializer.initialize(equipments, data.sets); // equipmentDict, eqSetArray

        console.log("Data loaded.");
        
        // Initialize refine estimator
        refiner = new RefineEstimator(updateStats);
        
        // Inventory configuration
        inventory = new EquipmentInventory(
            data.equipments,
            data.sets,
            function(eqs){
                var eqMap = new Map();
                for (let eq of eqs) {
                    eqMap.set(eq.name, eq);
                    
                    // If any piece refers to a set that is disabled by default, enable the set.
                    if (eq.set.disabled === true) {
                        eq.set.disabled = false;
                    }
                }
                
                loadUI(eqMap);
                
                // Re-select each previously selected equipment. However, if it's
                // no longer in the configured inventory, must deselect it.
                for (let eq of general.getEquipments()) {
                    if (!!eq) {
                        let eqName = eqMap.has(eq.name) ? eq.name : null;
                        selectEquipmentFromDropDownMenu(eq.type, eqName);
                    }
                }
            }
        );

        // Initialize the suit table
        suitTable = new SuitTable(
            // restoreGenFunc: to be called when the restore button is clicked.
            function(gen){
                // (1) Restore pieces from the given general
                var eqs = gen.getEquipments();
                for (let i = 0; i < eqs.length; i++) {
                    let eq = eqs[i];
                    if (!!eq) {
                        selectEquipmentFromDropDownMenu(eq.type, eq.name);
                    } else {
                        selectEquipmentFromDropDownMenu(_fromEquipmentIndex(i), null);
                    }
                }
            
                // (2) Disable the compare button
                suitTable.configureCompareButton();
            
                // (3) Scroll up
                $("html, body").animate({ scrollTop: 0 }, "fast");
            });
        
        var result = loadUI(null);
        if (!result) {
            panic("");
            return;
        }
    
        configureUI(false);
        
        // Pre-set from the URL
        let pruneNeeded = true;
        GeneralSerializer.deserialize(general);
        for (let eq of general.getEquipments()) {
            if (!!eq) {
                selectEquipmentFromDropDownMenu(eq.type, eq.name);
                if (eq.set.disabled === true) {
                    eq.set.disabled = false; // Enable the set disabled by default, if any piece from it is used in the pre-set.
                    pruneNeeded = false;
                }
            }
        }
        
        if (pruneNeeded) {
            // Options belonging to disabled sets can be removed now.
            _foreachEqType(function(eqType){
                // Locate the selector => options
                let selector = findDropdown(eqType);
                let options = selector.find("option");
                options.each(function(){
                    let opt = $(this);
                    let name = opt.attr("value");
                    let disabled = !!name && equipments[name].set.disabled;
                    if (disabled) {
                        opt.detach();
                    }
                });
            });
        }
        
        var callback = function() {
            configureUI(true);
        };
        
        $(window).resize(callback);
        
        // window.addEventListener("deviceorientation", callback);
        
        // if (screen.orientation) {
        //   screen.orientation.addEventListener("change", callback);
        // }
        
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
                }
                
                setLangLink(lang);
                
                updateSets();
                
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

function setLangLink(lang) {
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
    
    // Need to regenerate the link
    shareLink(true);
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

function _toggleBattleTypesTable($jso, isOn) {
    $legend = $jso.prev();
    if ($legend && !!isOn) {
        let txt = translator.translateByKey("What kind of battle?"); 
        $legend.text(txt);
    } else {
        let inputs = $jso.find("input");
        inputs.each(function(){
            var $input = $(this);
            if ($input.prop("checked")) {
                $legend.text($input.next().text());
            }
        });
    }
}
                
//toggleVisibility(this, 'battle-types-table')
function toggleVisibility(button, targetId, onToggle) {
    onToggle = onToggle || function(){};
    
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
        onToggle(tgt, true);
    } else {
        tgt.css("display", "none");
        onToggle(tgt, false);
    }
    
    // Update the image only if the style change was successful.
    img.attr("src", src);
}

function updateSets() {
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
    
    // Update the selector's border and set info (set name, count) 
    function updateSelector(type, setName, color, pieces) {
        var selector = findSelector(type);
        
        selector.css("border", "2px solid " + color + "");
        
        var setInfoElem = selector.find(".set-pieces");
        setInfoElem.text("(" + pieces + ")");
        
        if (setInfoElem.slider("instance") != undefined){
            setInfoElem.tooltip("destroy");
        }
            
        if (!!setName && pieces > 0) {
            // Add a tooltip to show the set info
            var tip = $("<div class='tooltip-div i18n' tkey='" + setName + "'>");
            tip.text(translator.translateByKey(setName));
            setInfoElem.tooltip({
              position: {
                my: "center bottom-5",
                at: "center top"
              },
              content: tip
            });
        }
    }

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
    _foreachEqType(function(eqType) {
        allTypes.add(eqType);
    });
    
    map.forEach(function(value, key) {
        if (!!value) {
            var len = value.length;
            if (len >= 2) {
                // Minimal set requirement met
                var color = getSetColor(key);
                for (var eq of value) {
                    var type = eq.type;
                    updateSelector(type, eq.set.name, color, value.length);
                    allTypes.delete(type);
                }
            } else if (len == 1) {
                let eq = value[0];
                var type = eq.type;
                // Minimal set requirement not met
                updateSelector(type, eq.set.name, "blue", 1);
                allTypes.delete(type);
            }
        }
    });
    
    allTypes.forEach(function(value) {
        // No equipment at this spot
        updateSelector(value, null, "blue", 0);
    });
}

// The buttons to share the current equipment selection

function shareLink(replaceLangOnly){
    var input = $("#equipment-config-controls #shareLinkBtn").next("input");
    if (replaceLangOnly === true) {
        var link = input.val();
        if (!link) { // If there is no link, don't bother
            return;
        }
    }
    
    var newLang = translator.getLang();
    var link = GeneralSerializer.serialize(general, newLang);
    input.val(link);
}

function copyLink(event){
    var that = event.target;
    var input = $(that).prev("input");
    var link = input.val();
      
      if (navigator.clipboard) { // This property is not available if the current protocol is not secure
        input.select();
        navigator.clipboard.writeText(link);
    } else {
        // A trick. See https://stackoverflow.com/questions/51805395/navigator-clipboard-is-undefined
        var textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            var successful = document.execCommand('copy');
        } finally {
            document.body.removeChild(textArea);
            input.select();
        }
    }
}
  
// UI component finders

function findCompareControl(){
    return $("#add-to-comparison-form");
}

function findCompareButton(){
    return $("#add-to-comparison-form button");
}

function findSelector(type){
    return $("#selector-" + type);
}

function findDropdown(type){
    return $("#selector-" + type + " select");
}

function findEquipmentImage(type){
    return $("#selector-" + type + " .equipment-pic img");
}

function findStar(type){
    return $("#selector-" + type + " .star");
}

function findTroopImgs(type){
    return $("#selector-" + type + " .troop");
}

function findStatRow(type){
    return $("#" + type + "-row");
}

function findMaterialRow(level){
    return $("#material-row-" + level + " div.count");
}
