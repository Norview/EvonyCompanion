// File: generalset.js
//
// A container to hold multiple generals with different settings. 

function _getKey(general){
	if (!!general){
		return general.getStringKey();
	} else {
		return null;
	}
}

function GeneralSet(capacity){
	this._generals = [];
    this._genSet = new Set();
    this._capacity = capacity;
}

// Get all generals.
GeneralSet.prototype.getAll = function() {
	var gens = [];
    for (var gen of this._generals) {
    	gens.push(gen);
    }
    
	return gens;
};

// Check if the given general already exists.
GeneralSet.prototype.has = function(general) {
	var key = _getKey(general);
	return this._genSet.has(key);
}

// Add a new general.
// Returns true if successfully added.
GeneralSet.prototype.add = function(general) {
	var key = _getKey(general);
	if (!!key // Valid key
		&& !this._genSet.has(key)) { // Not existent
		if (this._generals.length >= this._capacity) {
			// Need to make room
			this.remove(0);
		}
		
		if (this._generals.length < this._capacity) {	
			// Add a new one
			this._genSet.add(key);
			this._generals.push(general);
			return true;
		}
	}
	
	return false;
};

// Remove an existing general at the given index.
// Returns true if successfully removed. False mostly likely indicates absence of the general.
GeneralSet.prototype.remove = function(index) {
	if (index >=0 && index < this._generals.length){
		var general = this._generals.splice(index, 1)[0];
		var key = _getKey(general);
		if (!!key) {
			this._genSet.delete(key);
			return true;
		}
	}

	return false;
};

// Remove the given general.
// Returns true if successfully removed. False mostly likely indicates absence of the general.
GeneralSet.prototype.removeExact = function(general) {
	var key = _getKey(general);
	if (!!key) {
		for (var i = 0; i < this._generals.length; i++) {
			var gen = this._generals[i];
			if (_getKey(gen) === key) {
				// Remove it.
				this._generals.splice(i, 1);
				this._genSet.delete(key);
				return true;
			}
		}
	}
	
	return false;
};