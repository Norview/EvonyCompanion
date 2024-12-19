// File: suit_table.js
//
// A table for suit comparison

function SuitTable(/*function:*/restoreGenFunc) {
    // The behavior of restoreGenFunc is implemented outside; here it's only 
    // guaranteed that the function is called when "Restore" button is clicked.

    // UI component id
    const c_comparison_table = "#comparison-table";
        
    // The data store
    var generalSet = new GeneralSet(4);

    // The GUI component
    var ctable = null;
    
    // For back-referencing from callbacks and internal classes.
    var _stable = this;
    
    // The "Lock" button
    
    var lockMode = false;
    
    // TODO (5) - call this from the button's handler
    this.toggleLock = function() {
        if (!lockMode) {
            // Unlock
            lockMode = false;
            
            // TODO (1) -
            
            // Change pic
            
            // Mark all options as enabled   
                
            // Refresh the availability of compare button     
        } else {
            // Lock
            lockMode = true;
            
            // TODO (2) -
                    
            // Change pic
        
            // Get all civ eqs from the table
        
            // Mark them as disabled
        
            // Refresh the availability of compare button
        }
    }

    // The "Compare" button

    this.disableCompareButton = function(btn){
        btn.attr("disabled", true);
        btn.css("background-color", "grey");
        btn.css("color", "#d0d0d0");
        btn.find("img").attr("src", "../assets/add_disabled.png");
    }

    this.enableCompareButton = function(btn){
        btn.attr("disabled", false);
        btn.css("background-color", "");
        btn.css("color", "");
        btn.find("img").attr("src", "../assets/add.png");
    }

    this.configureCompareButton = function(){
        var compBtn = findCompareButton();
        this.disableCompareButton(compBtn);
        compBtn.click(function(){
            _stable.addGeneral(general);
            _stable.disableCompareButton(compBtn);
        });
    }

    // Enable "Compare" button if 
    // (1) we have at least one piece of equipment.
    // (2) the combination is not found in the set.
    // (3) TODO (3) - in lock mode, if none of the selected civ eq already appears in the table.
    // Otherwise, disable it instead.
    this.tryEnableCompareButton = function(general){
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
            this.enableCompareButton(compBtn);
        } else {
            this.disableCompareButton(compBtn);
        }
    }

    this.addGeneral = function(general){
        function makeDummyDragon(){
            return { 
                name: "generic-dragon",
                type: "dragon"
            };
        }

        // Create and insert a replica. Through the end we should only refer to the replica.
        var generalRep = general.clone();
    
        // Set a dummy dragon. In this table we always compare with a dragin included.
        generalRep.setAnimal(makeDummyDragon());
    
        var succ = generalSet.add(generalRep);
    
        if (succ) {
            // TODO (4) - if in lock mode, disable all the selected options
        
            if (ctable == null) {
                // Initialize the table
                ctable = new ComparisonTable(restoreGenFunc);
            }
        
            var battleType = getBattleType();
         
            // This unfortunately doesn't cover the case when the last slot is filled.
            var genCount = generalSet.getAll().length;
            var appendOnly = genCount < generalSet.getCapacity();
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
            
            // Scroll down to the table
            $(c_comparison_table)[0].scrollIntoView({ behavior: 'smooth' });
        }
    }

    this.removeGeneral = function(index, general) {
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
    
        this.tryEnableCompareButton(window.general);
    }

    this.updateGenerals = function(){
        if (!ctable) {
            return;
        }
    
        var battleType = getBattleType();
        ctable.updateAll(battleType);
    }

    this.changeGeneralCapacity = function(selectElement){
        var v = $(selectElement);
        var opt = v.find("option").filter(function() { return $(this).prop("selected") });
        var max = parseInt(opt.attr("value"));
        var removed = generalSet.setCapacity(max);
        if (removed > 0) {
            // Must clear the table and repopulate.
            var battleType = getBattleType();
            ctable.clearAll();
            var generals = generalSet.getAll();
            for (var gen of generals) {
                ctable.append(gen, battleType);
            }
        }
    }

    function ComparisonTable(restoreGenFunc){
        const c_comparison_table_delete_row = "#ct-delete-row";

        const entry_class = ".ctentry";
        const _entry_index_class_prefix = "ctentry-";
        const entry_index_class_prefix = "." + _entry_index_class_prefix;
        const c_buff_agg_row_id_prefix = "ct-buff-agg-";
        const c_buff_row_id_prefix = "ct-buff-";
        const c_debuff_agg_row_id_prefix = "ct-debuff-agg-";
        const c_debuff_row_id_prefix = "ct-debuff-";

        const c_data_general_obj = "data_general";
        const c_data_index_num = "data_index";

        // Locate all the display rows and cache them.
        //   - 1 delete button
        //   - 1 restore button
        //   - 6 equipments
        //   - 12 buff values
        //   - 12 debuff values
        //   - 3 aggregate buff values
        //   - 3 aggregate debuff values
        function initialize(){
            // Reset to the default capacity
            var ctableCapSel = $("#comparison-capacity-select option");
            ctableCapSel.each(function(index){
                $(this).prop("selected", index == 0 ? "true" : "");
            });
        
            var equipments = [];
            var buffs = [];
            var aggBuffs = [];
            var debuffs = [];
            var aggDebuffs = [];
            var deleteRow = null;
            var restoreRow = null;
            var rows = $(c_comparison_table + " tr");
            if (!!rows){
                rows.each(function(){
                    var child = $(this);
                    var id = child.attr("id");
                    if (!!id){
                        if (id.startsWith("ct-equipment-")) {
                            equipments.push(child);
                        } else if (id.startsWith(c_buff_agg_row_id_prefix)) {
                            aggBuffs.push(child);
                        } else if (id.startsWith(c_buff_row_id_prefix)) {
                            buffs.push(child);
                        } else if (id.startsWith(c_debuff_agg_row_id_prefix)) {
                            aggDebuffs.push(child);
                        } else if (id.startsWith(c_debuff_row_id_prefix)) {
                            debuffs.push(child);
                        } else if (id === "ct-delete-row") {
                            deleteRow = child;
                        } else if (id === "ct-restore-row") {
                            restoreRow = child;
                        }
                    }
                });
            }
    
            if (aggBuffs.length != 3) {
                console.warn("Located " + aggBuffs.length + " aggregate buff rows in the comparison table instead 3.");
            }
            if (aggDebuffs.length != 3) {
                console.warn("Located " + aggDebuffs.length + " aggregate debuff rows in the comparison table instead 3.");
            }
            if (buffs.length != 12) {
                console.warn("Located " + buffs.length + " buff rows in the comparison table instead 12.");
            }
            if (debuffs.length != 12) {
                console.warn("Located " + debuffs.length + " debuff rows in the comparison table instead 12.");
            }
            if (equipments.length != 6) {
                console.warn("Located " + equipments.length + " equipment rows in the comparison table instead 6.");
            }
            if (!deleteRow) {
                console.warn("Couldn't locate the delete row in the comparison table.");
            }
            if (!restoreRow) {
                console.warn("Couldn't locate the restore row in the comparison table.");
            }
    
            return {
                equipments : equipments,
                aggBuffs: aggBuffs,
                aggDebuffs: aggDebuffs,
                buffs : buffs,
                debuffs : debuffs,
                deleteRow : deleteRow,
                restoreRow : restoreRow
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
                type : idPart // EX: "groundAttack"
            };
        }
        
        // Return true if the given value is added into the aggregation; return false if the row is hidden.
        function aggregateBuffs(value, agg, btype, aggBuffCtrls){
            let btypelc = btype.toLowerCase();
            let buffKinds = ["attack", "defense", "hp"];
            for (let _buffKind of buffKinds) {
                if (isNaN(agg[_buffKind])) {
                    agg[_buffKind] = 0;
                }
                if (btypelc.indexOf(_buffKind) >= 0) {
                    let trooptype = btypelc.substring(0, btypelc.length - _buffKind.length); // remove the suffix to get the troop type
                    if (aggBuffCtrls[trooptype].data('excluded') !== true) {
                        // If this troop type is not excluded, add it up
                        agg[_buffKind] += value;
                        return true;
                    }
                }
            }
            
            // Not added into the aggregate
            return false;
        }
        
        function getAggBuff(aggBuffRow, agg, isBuff){
            // ct-(de)buff-agg-attack-row
            //                 |<-->|
            //                buffkind ("attack" in this case)
            let id = aggBuffRow.attr('id');
            let prefix = isBuff ? c_buff_agg_row_id_prefix : c_debuff_agg_row_id_prefix;
            let buffkind = id.substring(prefix.length, id.length - 4);
            let rowName = "ct-" + (isBuff ? "buff-agg-" : "debuff-agg-") + buffkind + "-cell";
            return {
                value: agg[buffkind],
                rowName : rowName
            };
        }
    
        // Populate the column for (de)buff properties
        function addBuffs(buffRows, aggBuffRows, aggBuffCtrls, isBuff, buffs, index, refineBuffs){
            let agg = {};
            for (var buffRow of buffRows) {
                var buffVal = getBuffInfoForRow(buffRow, buffs, isBuff);
                var btype = buffVal.type;
                
                // Style
                var isGrey = btype.startsWith("mounted") || btype.startsWith("siege");
                var bgColor = isGrey ? "grey " : "";
                
                // Value, merged with refines
                var value = buffVal.value;
                if (isBuff) {
                    // Add the extra buffs from refines
                    value += (refineBuffs[btype] || 0);
                }
                var valStr = value + "%";
                
                var shown = aggregateBuffs(value, agg, btype, aggBuffCtrls);
                
                // Example:
                // <td class="ctentry ctentry-0 ct-buff-mountedAttack-cell row-vis-agg-factor">15%</td>
                var rowName = "ct-" + (isBuff ? "buff-" : "debuff-") + btype + "-cell";
                var td = $("<td class=\"" + bgColor + rowName + " row-vis-agg-factor ctentry ctentry-" + index + "\">" + valStr + "</td>");

                var deco = getBuffDeco(function(){
                    return isGrey;
                }, value);
    
                td.css("color", deco.color);
                if (!!deco.isMax) {
                    td.css("fontWeight");
                }
                
                // This row could be hidden now. Add the cell in hidden mode as well.
                if (shown !== true) {
                    td.hide();
                }

                buffRow.append(td);
            }
            
            let aggCellStylingClass = isBuff ? "buffaggcell" : "debuffaggcell";
            for (var aggBuffRow of aggBuffRows) {
                let aggBuff = getAggBuff(aggBuffRow, agg, isBuff);
                let valStr = aggBuff.value + "%";
                var td = $("<td class=\"" + aggCellStylingClass + " " + aggBuff.rowName + " ctentry ctentry-" + index + "\">" + valStr + "</td>");
                td.css("fontWeight");
                aggBuffRow.append(td);
            }
        }
    
        function updateBuffs(buffRows, aggBuffRows, aggBuffCtrls, columns, isBuff) {
            let aggs = [];      
            var propName = isBuff ? "buffs" : "debuffs";
            // Update per row
            for (var buffRow of buffRows) {
                var tds = buffRow.find(entry_class);
                tds.each(function(_index){
                    var td = $(this);
                    var column = columns[_index];
                
                    // Get the base buff
                    var buffs = column[propName];
                    var buffVal = getBuffInfoForRow(buffRow, buffs, isBuff);
                    var value = buffVal.value;
                    
                    var btype = buffVal.type;
                    if (isBuff) {
                        // Add the extra buffs from refines
                        var refineBuffs = column["refines"];
                        value += (refineBuffs[btype] || 0);
                    }
                    
                    let agg = aggs[_index];
                    if (!agg) {
                        aggs[_index] = agg = {};
                    }
                    aggregateBuffs(value, agg, btype, aggBuffCtrls);
                    
                    td.text(value + "%");
                
                    var isGrey = btype.startsWith("mounted") || btype.startsWith("siege");
                    var deco = getBuffDeco(function(){
                        return isGrey;
                    }, value);
    
                    td.css("color", deco.color);
                    if (!!deco.isMax) {
                        td.css("fontWeight");
                    }
                });
            }

            for (var aggBuffRow of aggBuffRows) {
                var tds = aggBuffRow.find(entry_class);
                tds.each(function(_index){
                    var td = $(this);
                    let aggBuff = getAggBuff(aggBuffRow, aggs[_index], isBuff);
                    td.text(aggBuff.value + "%");
                });
            }
        }
        
        function installAggButton(row, isBuff, ct) {
            // Example: ct-debuff-groundAttack-row
            const suffix = "Attack-row";
            let id = row.attr('id');
            if (id.endsWith(suffix)) {
                let attackBuff = row;
            
                // Find the rows representing def and hp buff for the same troop category.
                // ct-debuff-groundAttack-row (id) => ct-debuff-ground (stem)
                let stem = id.substring(0, id.length - suffix.length);
                let otherBuffs = attackBuff.siblings().filter(function() {
                  return $(this).attr('id').startsWith(stem);
                });
                let allBuffs = attackBuff.add(otherBuffs);
                            
                let _ctrl = attackBuff.find(".row-vis-agg-ctrl");
                _ctrl.on("click", function(){
                    let _factors = allBuffs.find(".row-vis-agg-factor");
                    let _img = _ctrl.children("img");
                    let _src = _img.attr("src");

                    let _excluded = !!_ctrl.data("excluded");
                    if (_excluded) {
                        // Reveal and enable agg
                        _ctrl.removeData("excluded");
                        _factors.show();
                        _src = _src.replace("show.png", "hide.png");
                    } else {
                        // Hide and disable agg
                        _ctrl.data("excluded", true);
                        _factors.hide();
                        _src = _src.replace("hide.png", "show.png");
                    }
            
                    _img.attr("src", _src);
                    
                    ct.updateAll();
                });
                
                // ct-debuff-ground (stem) => ground (troopType)
                let lastDashIndex = stem.lastIndexOf('-');
                let troopType = stem.substring(lastDashIndex +  1);
            
                return {
                    ctrlItem : _ctrl,
                    troopType : troopType // "ground"
                };
            }
            
            return null;
        }
        
        var obj = initialize();
    
        this._equipments = obj.equipments;
        this._aggBuffs = obj.aggBuffs;
        this._aggBuffCtrls = {};
        this._aggDebuffs = obj.aggDebuffs;
        this._aggDebuffCtrls = {};
        // _aggBuffCtrls and _aggDebuffCtrls are dictionaries of trooptype~ctrlElem mapping.
        this._buffs = obj.buffs;
        this._debuffs = obj.debuffs;
        this._deleteRow = obj.deleteRow;
        this._restoreRow = obj.restoreRow;
        this._index = -1;
        this._currentScenario = null;
        
        for (let _buff of this._buffs) {
            let ctrlObj = installAggButton(_buff, true, this);
            if (!!ctrlObj) {
                this._aggBuffCtrls[ctrlObj.troopType] = ctrlObj.ctrlItem;
            }
        }
        for (let _debuff of this._debuffs) {
            let ctrlObj = installAggButton(_debuff, false, this);
            if (!!ctrlObj) {
                this._aggDebuffCtrls[ctrlObj.troopType] = ctrlObj.ctrlItem;
            }
        }
    
        // Update the table with the given scenario. If scenario is not provided, reuse the current scenario.
        this.updateAll = function(scenario) {
            this._currentScenario = scenario = (scenario || this._currentScenario);
            var delHeaders = this._deleteRow.find(entry_class);
        
            // Each contains the index of the column and the buffs objects
            var columns = [];
        
            // Locate each general on the row
            delHeaders.each(function(){
                var header = $(this);
                var general = header.data(c_data_general_obj);

                var refineBuffs = refiner.getBuffs(general);

                columns.push({
                    buffs: general.getBuffs(scenario, c_starring_max).buffs,
                    debuffs: general.getDebuffs(c_starring_max).buffs,
                    refines: refineBuffs
                });
            });
        
            // Update
            updateBuffs(this._buffs, this._aggBuffs, this._aggBuffCtrls, columns, true);
            updateBuffs(this._debuffs, this._aggDebuffs, this._aggDebuffCtrls, columns, false);
        };
    
        this.clearAll = function() {
            if (!!this._deleteRow){
                var entries = this._deleteRow.find(entry_class);
                entries.remove();
            }
            if (!!this._restoreRow){
                var entries = this._restoreRow.find(entry_class);
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
                    _stable.removeGeneral(index, general);
                });
            
                // Attach the metadata
                btn.data(c_data_general_obj, general);
            }
            
            // 2. Add restore button
            if (!!this._restoreRow) {
                // Example:
                // <th class="ctentry ctentry-0"><image src="./assets/restore.png" style="width:24px"></th> <!-- provided by: https://icons8.com -->
                var btn = $("<th class=\"ctentry ctentry-" + index + "\"><image src=\"./assets/restore.png\" style=\"width:24px\"></th>");
                this._restoreRow.append(btn);
             
                // Add handler
                btn.click(function(){
                    if (!!restoreGenFunc && typeof restoreGenFunc === "function") {
                        restoreGenFunc(general);
                    }
                });
            }
        
            // 3. Add equipment names
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
            
            // 4. Add buffs and debuffs
            var refineBuffs = refiner.getBuffs(general);
            
            var buffs = general.getBuffs(scenario, c_starring_max).buffs;
            addBuffs(this._buffs, this._aggBuffs, this._aggBuffCtrls, true, buffs, index, refineBuffs);
        
            var debuffs = general.getDebuffs(c_starring_max).buffs;
            addBuffs(this._debuffs, this._aggDebuffs, this._aggDebuffCtrls, false, debuffs, index, []);
        };
    }
}
