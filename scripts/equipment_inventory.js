// File: equipment_inventory.js
//
// Configure equipment inventory.

////// Constructor //////

// eqArray is slightly modified on top of the raw data from equipments.json. 
// All ref fields such as set are now deref'ed. For example, eq.set is no longer a string, but the object representing the set.
function EquipmentInventory(eqArray, eqSetArray, onClose){
	function clearSelected(arr, $element){
		arr.length = 0;
		if (!!$element) {
			var children = $element[0].children;
			for (var c of children) {
				if (c.selected) {
					c.selected = false;
				}
			}
		}
	}

	function configSelect(id, _arr){
		// Handler on selection
		var _$select = that._container.find("#" + id);
		_$select.on("change", onSelection.bind(_$select, _arr));
		
		// Reset selected
		clearSelected(_arr, _$select);
		
		return _$select;
	}
	
	function refreshSelected(selectedEquipments){
		_$selected.empty();
		// <option value = "King's Bow">King's Bow</option>
		for (var sequip of selectedEquipments) {
			$optNode = $("<option value=\"" + sequip.name + "\">" + sequip.name + "</option>");
			$optNode.data("eq", sequip);
			$optNode.appendTo(_$selected);
		}
		
		that._selectedEqs.length = 0;
	}
	
	function getAll() {
		var remaining = [];
		for (let opt of _$selected.children("option")) {
			remaining.push($(opt).data("eq"));
		}
		
		return remaining;
	}

	function onSelection(arr){
		var top = $(this)[0];
		var elemId = top.id;
		var children = top.children;
		
		// Clear
		arr.length = 0;
		
		for (var c of children) {
			if (c.selected) {
				arr.push(c.value);
			}
		}
		
		// Clear the other side
		if (elemId === "eqconf-selected") {
			clearSelected(that._selectedSets, _$sets);
			clearSelected(that._selectedParts, _$parts);
		} else {
			clearSelected(that._selectedEqs, _$selected);
		}
		
		// Determine the buttons' availability
		_$addBtn.prop("disabled", true);
		_$removeBtn.prop("disabled", true);
		if (that._selectedSets.length > 0 && that._selectedParts.length > 0) {
			_$addBtn.prop("disabled", false);
		} else if (that._selectedEqs.length > 0) {
			_$removeBtn.prop("disabled", false);
		}
			
		// _$removeAllBtn.prop("disabled", _$selected.children().length <= 0);
		
		// Debug info
		/*
		console.info("selected " + elemId + ": " + arr);
		console.info("selected sets: " + that._selectedSets);
		console.info("selected parts: " + that._selectedParts);
		console.info("pending for removal: " + that._selectedEqs);
		console.info("can add? " + (_$addBtn.prop("disabled") !== true));
		console.info("can remove? " + (_$removeBtn.prop("disabled") !== true));
		*/
	}
	
	function addEquipments() {
		// Aggregate the selected equipments by combining the sets and parts
		var selectedEqMap = new Map();
		for (var sset of that._selectedSets) {
			var pieces = that._setMap.get(sset);
			for (var spart of that._selectedParts) {
				var eq = pieces[spart];
				// Could be an array (regular equipments)
				if (Array.isArray(eq)) {
					for (let e of eq) {
						selectedEqMap.set(e.name, e);
					}
				} else {
					selectedEqMap.set(eq.name, eq);
				}
			}
		}
		
		// Merge with the current inventory.
		_$selected.children("option").each(
			function (index, child) {
				selectedEqMap.set(child.value, $(child).data("eq"));
			}
		);
		
		// Sort in the order set-number -> part postion.
		var selectedEquipments = [];
		for (var eq of selectedEqMap.values()) {
			selectedEquipments.push(eq);
		}
		selectedEquipments.sort(function(eq1, eq2) {
			// Compare set's order first
			var o1 = sets.get(eq1.set.name);
			var o2 = sets.get(eq2.set.name);
			var diff = o1 - o2;
			if (!isNaN(diff) && diff !== 0) {
				return diff;
			}
			
			// Then the part's position
			var t1 = _toEquipmentIndex(eq1.type);
			var t2 = _toEquipmentIndex(eq2.type);
			return t1 - t2;
		});
		
		// Refresh the list on the right side. 
		refreshSelected(selectedEquipments);
	}
	
	function addAllEquipments() {
		// Remove current selections
		that._selectedSets.length = 0;
		that._selectedParts.length = 0;
		
		// Populate the selection with all equipments
		for (let s of sets.keys()) {
			that._selectedSets.push(s);
		}
		for (let p of _$parts.children()) {
			that._selectedParts.push(p.value);
		}

		addEquipments();
	}
	
	var that = this;
	
	this._eqList = eqArray; // All equipments
	
	// set -> {type: name}
	/*
	   {
          "name": "Plantagenet Ring",
          "set": "Plantagenet",
          "type": "ring",
          "condition": { ... },
          "cost": [ ... ],
          "attributes": [ ... ]
       },
	*/
	
	// Store sets' order in another map
	// {
    //    "name": "Furinkazan",
    //    "order": 53,
    //    ...
	var sets = new Map();
    for (var eqSet of eqSetArray){
    	sets.set(eqSet.name, eqSet.order);
    }
	
	// The jQuery objects

	this._separator = $("#equipment-config-sep");
    this._container = $("#equipment-config-div"); // The outmost div, which should contain the following elements:
	//
	// ID					 Type					Purpose								Data
	//
	// eqconf-add-btn    	 Button					Add equipments						Availability depending on selection
	// eqconf-remove-btn     Button					Remove equipments					Availability depending on selection
	// eqconf-add-all-btn    Button					Add all equipments					-
	// eqconf-remove-all-btn Button					Remove all equipments				-
	// eqconf-close-btn      Button					Close the config interface			-
	// eqconf-sets           Multiple-select		Show the list of sets				Read from the initialization. Stay unchanged throughout the app's lifecycle
	// eqconf-parts          Multiple-select		Show the list of parts				The six parts of a set. Fixed.
	// eqconf-selected       Multiple-select		Show the list of equipments owned	The owned equipments. Can be added from sets/parts or removed using the buttons.
	//
	
	this._selectedSets = [];
	this._selectedParts = [];
	this._selectedEqs = []; // Owned equipments
	
	var _$sets = configSelect("eqconf-sets", this._selectedSets);
	var _$parts = configSelect("eqconf-parts", this._selectedParts);
	var _$selected = configSelect("eqconf-selected", this._selectedEqs);
	
	// Collect all equipments into a map keyed by set's name. Each element is an object with six properties corresponding to the six parts.
	// The property is scalar for civilization or vector for regular equipment.
	this._setMap = new Map(); 
	for (var eq of eqArray) {
		var name = eq.set.name;
		var order = sets.get(name);
		if (!this._setMap.has(name) && !isNaN(order)){ // Add this equipment only if the set is also found.
			this._setMap.set(name, {});
		}
		var pieces =  this._setMap.get(name);
		if (order < 50) { // Regular equipment. There could be 2 - 4 pieces in a slot.
			var eqArr = pieces[eq.type];
			if (!eqArr) {
				pieces[eq.type] = eqArr = [];
			}
			eqArr.push(eq);
		} else { // Civilization equipment. There is only one piece in each slot.
			pieces[eq.type] = eq;
		}
	}
	
	// Populate set names
	_$sets.empty();
	for (let _set of this._setMap.keys()) {
		// <option value = "Freedom">Freedom</option>
		$optNode = $("<option value=\"" + _set + "\">" + _set + "</option>");
		$optNode.appendTo(_$sets);
	}
	
	var _$closeBtn = this._container.find("#eqconf-close-btn");
	_$closeBtn.click(function (e) {
		that.toggle(false);
		onClose(getAll());
	});
	
	/* // This button is confusing. Let's not add it for now.
	var _$addAllBtn = this._container.find("#eqconf-add-all-btn");
	_$addAllBtn.prop("disabled", false);
	_$addAllBtn.click(addAllEquipments);
	*/
	
	var _$removeAllBtn = this._container.find("#eqconf-remove-all-btn");
	_$removeAllBtn.prop("disabled", false);
	_$removeAllBtn.click(function () {
		refreshSelected([]);
	});
	
	var _$addBtn = this._container.find("#eqconf-add-btn");
	_$addBtn.prop("disabled", true);
	_$addBtn.click(addEquipments);
	
	var _$removeBtn = this._container.find("#eqconf-remove-btn");
	_$removeBtn.prop("disabled", true);
	_$removeBtn.click(function () {
		// Collect unselected items
		var remaining = [];
		for (let opt of _$selected.children("option")) {
			if (!opt.selected) {
				remaining.push($(opt).data("eq"));
			}
		}

		refreshSelected(remaining);
	});
	
	// Initialize
	addAllEquipments();
}

////// Public API //////

EquipmentInventory.prototype.toggle = function(explicitEnableOrDisable){
	var toEnable;
	if (explicitEnableOrDisable === true) {
		toEnable = true;
	} else if (explicitEnableOrDisable === false) {
		toEnable = false;
	} else {
		toEnable = this._separator.css("display") === "none";
	}
	
	var val = (toEnable ? "" : "none");
	
	this._separator.css("display", val);
    this._container.css("display", val); 
}