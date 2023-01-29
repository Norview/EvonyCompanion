// File: refine_estimator.js
//
// Configure the UI components for evaluating the refine effects.
//
// For the currently selected pieces, the user may add extra buffs as a result of refining.
// This UI only allows refining for a single specific troop type. It's mainly used to count
// in the extra buff from high-value equipments.

////// Constructor //////

function RefineEstimator(onChange){
	onChange = onChange || function(){};
	
	var $container = $("#refine-div"); // The outmost div, which should contain the following elements:
	// Type						ID									Function
	// -----------------------  ----------------------------        -----------------------------------
	// <input type="checkbox">	refine-type-checkbox-ground			Select to refine for ground troops
	// <input type="checkbox">	refine-type-checkbox-mounted		Select to refine for mounted troops
	// <input type="checkbox">	refine-type-checkbox-ranged			Select to refine for ranged troops
	// <input type="checkbox">	refine-type-checkbox-siege			Select to refine for siege troops
	// <div>					refine-slider						Slide to specify the refine percentage (0 - 100%).
	//																This will translate to the actual buff based on the equipment's refine range. For example,
	//																Dragon's refine limit is 15%, so a 80% refine convers to 12% buff (15% * 80%).
	// <div>					refine-handle						The handle on the slider
	
	var $checkboxes = []
	var inputs = $container.find("input");
	inputs.each(function() {
 		var $cb = $(this);
 		if ($cb.attr("id").startsWith("refine-type-checkbox-")) {
			$checkboxes.push($cb);
			var id = $cb.attr("id");
	
			let func = function(toggle){
				for (let c of $checkboxes) {
					if (c.attr("id") !== id) {
						// Unselect the others
						c.prop("checked", false);
					} else if (toggle === true) {
						// Toggle this one (only if asked to)
						c.prop("checked", !c.prop("checked"));
					}
				}
			
				onChange();
			};
			
			// Only one can be selected at any time
			$cb.click(func);
			
			// Apply the same function to the leading <label/>
			$cb.prev().click(func.bind(null, true));
 		}
	});
	
	var $handle = $container.find("#refine-handle");
	var $slider = $container.find("#refine-slider").slider({
	  orientation: "horizontal",
      range: "min",
	  value: 0,
	  min: 0,
	  max: 100,
	  step: 5,
	  create: function() {
        $handle.text($(this).slider("value") + "%");
      },
      slide: function(event, ui) {
      	var val = ui.value;
        $handle.text(val + "%");
        
        // Change color
        var color = "white";
        if (val >= 85) {
        	color = "gold";
        } else if (val >= 70) {
        	color = "orange";
        } else if (val >= 50) {
        	color = "#8000FF";
        }
        
        $handle.css("color", color);
        
		onChange();
      }          
	});
       
	this.getRefinePercentage = function(){
		var txt = $handle.text();
		var txtNum = txt.trim().substring(0, txt.length - 1);
		var num = parseInt(txtNum);
		return num;
	};
  
	this.getTroopType = function(){
		for (let c of $checkboxes) {
			if (c.prop("checked") === true) {
				let id = c.attr("id");
				let typ = id.substring(id.lastIndexOf("-") + 1);
				return typ;
			}
		}
	};
}

////// Public API //////

// Return structured data:
// {
//   "mountedAttack" : 48,
//   "siegeHp": 68
//   "{troopBuff}": {num}
//   ... (6 props max) ...
// }
RefineEstimator.prototype.getBuffs = function(general){
	var buffs = {};
	var eqs = general.getEquipments();
	for (var equipment of eqs) {
		if (!equipment) {
			continue;
		}
		
		var eqType = equipment.type;
		var btype = "Hp"; // eqType === "legarmor" || eqType === "helmet"
		if (eqType === "weapon" || eqType === "ring"){
			btype = "Attack";
		} else if (eqType === "armor" || eqType === "boots"){
			btype = "Defense";
		}
	
		var val = equipment.set.order;
		var max = 0;
		if (val == 26) {
			max = 15;
		} else if (val == 27) {
			max = 20;
		} else if (val > 27 && val <= 33) {
			max = 25;
		} else if (val >= 50) {
			max = 30;
		}
	
		var ttype = this.getTroopType();
		var troopBuffType = ttype + btype;
		
		var perc = this.getRefinePercentage();
		var buffVal = Math.floor(4 * max * perc / 100); // 4 refine attributes in total
	
		buffs[troopBuffType] = buffVal;
	}
	
	return buffs;
}