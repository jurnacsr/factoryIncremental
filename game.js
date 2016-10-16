$(document).ready(loaded);

var ID = 0;
var FACTORY_WIDTH = 190;
var MAX_FACTORIES = 25;
var nextFactoryCost = 100;
var factories = [];
var unlockedFactories = [];
var numFactories = 0;
var factoryCost = 1;
var money = 100;
var factoryCostFactor = 1.33;

var BASIC_UPGRADES = [
	'Increase final production amount by 25%.  Cost: ${{COST}}\nCurrent Level: {{LEVEL}}',
	'Increase production speed by 50%.  Cost: ${{COST}}\nCurrent Level: {{LEVEL}}'
];

function Factory(x, y) {
	this.id = ID;
	this.cell = {x: x, y: y};
	this.name = '';
	this.counter = 0;
	this.inc = 5;
	this.seen = false;
	this.active = false;
	this.moneyInc = 25;
	this.runTime = 5000;  // in milliseconds
	this.lastUpdate = 0;
	this.maxInc = 100;
	this.maxed = false;
	this.started = false;

	this.basicUpgradeButton = {};
	this.basicUpgradeLevel = 0;
	this.basicUpgradeCost = 25;
	this.basicUpgradeFactor = 1.85;
	this.speedUpgradeFactor = 1;
	this.basicUpgradeIncomeInc = 1.25;
	this.basicUpgradeSpeedInc = 1.5;

	this.managedUpgradeButton = {};
	this.managed = false;	


	this.totalNeighbors = 0;
	this.neighborUpgradeButton = {};
	this.neighborBonus = 0.75;
	this.neighborUpgradeLevel = 0;
	this.neighborUpgradeCost = 25;
	this.neighborUpgradeCostFactor = 2.66;
	this.neighborUpgradeTooltipText = 'Increase production by 75% per neighbor per level.  Cost: ${{COST}}\nCurrent Level: {{LEVEL}}';

	this.horizontalPartners = 0;
	this.horizontalUpgradeButton = {};
	this.horizontalBonus = 0.50;
	this.horizontalUpgradeLevel = 0;
	this.horizontalUpgradeCost = 25;
	this.horizontalUpgradeCostFactor = 2.66;
	this.horizontalUpgradeTooltipText = 'Increase production by 50% per unit on the same horizontal plane per level.  Cost: ${{COST}}\nCurrent Level: {{LEVEL}}';

	this.verticalPartners = 0;
	this.verticalUpgradeButton = {};
	this.verticalBonus = 0.25;
	this.verticalUpgradeLevel = 0;
	this.verticalUpgradeCost = 25;
	this.verticalUpgradeCostFactor = 2.66;
	this.verticalUpgradeTooltipText = 'Increase production by 25% per unit on the same vertical plane per level.  Cost: ${{COST}}\nCurrent Level: {{LEVEL}}';


	// parse template to create the factory's dom
	var templateData = {
		"id": this.id
	}
	var template = $.templates("#factoryTemplate");
	var output = template.render(templateData);
	this.element = $.parseHTML(output);
	this.element = $(this.element);  // make me jquery like one of your french girls jack
	this.element.css('visibility', 'hidden');

	this.initiate = function() {
		this.element.css('visibility', 'visible');

		this.basicUpgradeButton = this.element.find('.basicUpgradeButton');
		this.basicUpgradeButton.attr('title', this.basicUpgradeTooltip());
		this.basicUpgradeButton.click($.proxy(this.basicUpgradeClick, this));

		this.managedUpgradeButton = this.element.find('.managedUpgradeButton');
		this.managedUpgradeButton.click($.proxy(this.toggleManaged, this));

		this.neighborUpgradeButton = this.element.find('.neighborUpgradeButton');
		this.neighborUpgradeButton.attr('title', this.neighborUpgradeTooltip());
		this.neighborUpgradeButton.click($.proxy(this.neighborUpgradeClick, this));

		this.horizontalUpgradeButton = this.element.find('.horizontalUpgradeButton');
		this.horizontalUpgradeButton.attr('title', this.horizontalUpgradeTooltip());
		this.horizontalUpgradeButton.click($.proxy(this.horizontalUpgradeClick, this));

		this.verticalUpgradeButton = this.element.find('.verticalUpgradeButton');
		this.verticalUpgradeButton.attr('title', this.verticalUpgradeTooltip());
		this.verticalUpgradeButton.click($.proxy(this.verticalUpgradeClick, this));

		this.cell = findCell(this.id);
		windowResize();
		this.recheckNeighbors();
		
	}

	this.verticalUpgradeTooltip = function() {
		return this.verticalUpgradeTooltipText.replace('{{COST}}', this.verticalUpgradeCost.toFixed(2)).replace('{{LEVEL}}', this.verticalUpgradeLevel);
	}

	this.horizontalUpgradeTooltip = function() {
		return this.horizontalUpgradeTooltipText.replace('{{COST}}', this.horizontalUpgradeCost.toFixed(2)).replace('{{LEVEL}}', this.horizontalUpgradeLevel);
	}

	this.neighborUpgradeTooltip = function() {
		return this.neighborUpgradeTooltipText.replace('{{COST}}', this.neighborUpgradeCost.toFixed(2)).replace('{{LEVEL}}', this.neighborUpgradeLevel);
	}

	this.basicUpgradeTooltip = function() { 
		return BASIC_UPGRADES[(this.basicUpgradeLevel % 2)].replace('{{COST}}', this.basicUpgradeCost.toFixed(2)).replace('{{LEVEL}}', this.basicUpgradeLevel+1);
	}

	this.click = function() {
		if (!this.started) {
			this.started = true;
			this.lastUpdate = new Date().getTime();
		}
		if (this.maxed) {
			this.resetCounter();
		}
	}

	this.basicUpgradeClick = function(e) {
		if (money >= this.basicUpgradeCost) {
			money -= this.basicUpgradeCost;
			this.basicUpgradeCost *= this.basicUpgradeFactor;
			this.basicUpgradeLevel++;
			this.basicUpgradeButton.attr('title', this.basicUpgradeTooltip());

			// time calc here
			var speedUpgrades = Math.floor(this.basicUpgradeLevel / 2);
			var speedFactor = 1;
			for (var i = 0; i < speedUpgrades; i++) {
				speedFactor *= this.basicUpgradeSpeedInc;
			}
			this.speedUpgradeFactor = speedFactor;
		}
		e.stopPropagation();
	}

	this.neighborUpgradeClick = function(e) {
		if (money >= this.neighborUpgradeCost) {
			money -= this.neighborUpgradeCost;
			this.neighborUpgradeCost *= this.neighborUpgradeCostFactor;
			this.neighborUpgradeLevel++;
			this.neighborUpgradeButton.attr('title', this.neighborUpgradeTooltip());
		}
		e.stopPropagation();
	}

	this.horizontalUpgradeClick = function(e) {
		if (money >= this.horizontalUpgradeCost) {
			money -= this.horizontalUpgradeCost;
			this.horizontalUpgradeCost *= this.horizontalUpgradeCostFactor;
			this.horizontalUpgradeLevel++;
			this.horizontalUpgradeButton.attr('title', this.horizontalUpgradeTooltip());
		}
		e.stopPropagation();
	}

	this.verticalUpgradeClick = function(e) {
		if (money >= this.verticalUpgradeCost) {
			money -= this.verticalUpgradeCost;
			this.verticalUpgradeCost *= this.verticalUpgradeCostFactor;
			this.verticalUpgradeLevel++;
			this.verticalUpgradeButton.attr('title', this.verticalUpgradeTooltip());
		}
		e.stopPropagation();
	}

	this.toggleManaged = function(e) {
		this.managed = !this.managed;
		var managedGlyph = this.element.find(".managedGlyph");
		if (this.managed) {
			$(managedGlyph).removeClass("glyphicon-briefcase");
			$(managedGlyph).addClass("glyphicon-wrench");
			this.managedUpgradeButton.attr('title', 'This factory is automatically managed.  Production and speed is lessened by the overhead.');
		} else {
			$(managedGlyph).addClass("glyphicon-briefcase");
			$(managedGlyph).removeClass("glyphicon-wrench");
			this.managedUpgradeButton.attr('title', 'Click to add a manager to this factory.  Production will be automated, but you will lose speed and income.');
		}
		e.stopPropagation();
	}

	this.resetCounter = function() {
		this.counter = 0;
		this.maxed = false;

		// upgrade calculations
		money+=this.calcMoney();
	}

	this.calcMoney = function() {
		// basic upgrade levels
		var moneyUpgrades = Math.floor(this.basicUpgradeLevel / 2) + this.basicUpgradeLevel % 2;
		var moneyFactor = 1;

		// alignment bonuses
		moneyFactor += ((this.horizontalBonus * this.horizontalUpgradeLevel) * this.horizontalPartners);
		moneyFactor += ((this.verticalBonus * this.verticalUpgradeLevel) * this.verticalPartners);
		moneyFactor += ((this.neighborBonus * this.neighborUpgradeLevel) * this.totalNeighbors);

		for (var i = 0; i < moneyUpgrades; i++) {
			moneyFactor *= this.basicUpgradeIncomeInc;
		}

		var managedLoss = this.managed ? 0.25 : 1;
		var finalFactor = (this.moneyInc * moneyFactor) * managedLoss;
		return finalFactor;
	}

	this.update = function() {
		if (this.started) {
			var p = (this.counter / this.runTime) * 100;
			this.element.find(".factoryProgressBarChild").css('width', (p)+'%');
			var timeInc = (new Date().getTime() - this.lastUpdate);
			this.lastUpdate = new Date().getTime();
			if (this.counter >= this.runTime) {
				this.maxed = true;

				if (this.managed) {
					this.resetCounter();
				}
			} else if (!this.maxed) {
				this.counter += timeInc * this.speedUpgradeFactor;
			}

			if (this.maxed) {
				this.element.find("."+this.id + "-status").text("Ready for pickup!");
			} else {
				this.element.find("."+this.id + "-status").text("Working");	
			}
		}
		if (this.verticalPartners > 0) {
			this.element.find(".verticalBonusIndicator").css('visibility', 'visible');	
		} else {
			this.element.find(".verticalBonusIndicator").css('visibility', 'hidden');
		}
		if (this.horizontalPartners > 0) {
			this.element.find(".horizontalBonusIndicator").css('visibility', 'visible');	
		} else {
			this.element.find(".horizontalBonusIndicator").css('visibility', 'hidden');

		}
		if (this.totalNeighbors > 0) {
			this.element.find(".neighborBonusIndicator").css('visibility', 'visible');	
		} else {
			this.element.find(".neighborBonusIndicator").css('visibility', 'hidden');

		}
	};

	this.recheckNeighbors = function() {
		this.cell = findCell(this.id);
		this.horizontalPartners = 0;
		this.verticalPartners = 0;
		this.totalNeighbors = 0;
		for (var i = 0; i < factories.length; i++) {
			var other = factories[i];
			if (other.id == this.id) continue;
			if (!isFactoryVisible(other)) continue;
			if (other.cell.x == this.cell.x) {
				this.verticalPartners++;
			} 
			if (other.cell.y == this.cell.y) {
				this.horizontalPartners++;
			}
			if (Math.abs(other.cell.x - this.cell.x) <= 1 && 
				Math.abs(other.cell.y - this.cell.y) <= 1) {
				this.totalNeighbors++;
			}
		}
	}

	ID++;
}

function gameLoop() {
	$.each(factories, updateFactory);

	$(".money-span").text(money.toFixed(2));
	$(".factoryCostSpan").text(nextFactoryCost.toFixed(2));
}

function updateFactory(index, factory) {
	factory.update();
}

function loaded() {

	// resize function - reestablish factory relationships
	$(window).resize(windowResize);
	// load saved game if it exists
	if (savedGameExists()) {
		// read saved game
	} else {
		// create game from new
		initHiddenFactories();
	}

	$('body').on('click', 'div.factory', factoryClick);
	resizeContainer();

	$(".buy-factory").click(tryBuyFactory);

	// set the game loop
	gameLoop();
	setInterval(gameLoop, 50);

	$(".game").show();
	$(".loading").hide();
}

function tryBuyFactory(e) {
	e.preventDefault();
	if (numFactories >= MAX_FACTORIES) {
		return;
	}
	if (money >= nextFactoryCost) {
		money -= nextFactoryCost;
		nextFactoryCost *= factoryCostFactor;
		var randIndex = getUnusedIndex();
		factories[randIndex].initiate();
		numFactories++;
		if (numFactories >= MAX_FACTORIES) {
			$(".buy-factory").addClass("disabled");
			$(".buy-factory").text("No More Zoned Land");
		}

	}
}

function getUnusedIndex() {
	var tries = 0;
	while (true) {
		var randIndex = randomInRange(0, MAX_FACTORIES);
		if (unlockedFactories[randIndex] != -1) {
			unlockedFactories[randIndex] = -1;
			return randIndex;
		} 
		tries++;
	}
}

function factoryClick(e) {
	factories[$(e.target).closest(".factory").attr('id')].click();
}

function windowResize() {
	$.each(factories, factoryRecheck);
	resizeContainer();
}

function resizeContainer() {
	$(".gameContainer").width(Math.floor($(window).width() / FACTORY_WIDTH * .9) * FACTORY_WIDTH);
}

function factoryRecheck(index, e) {
	if (isFactoryVisible(factories[e.id])) {
		factories[e.id].recheckNeighbors();
	}
}

function isFactoryVisible(f) {
	return ($(f.element[1]).css('visibility') != 'hidden');
}

function findCell(id) {
	// we're doing this the old fashioned way
	var cellWidth = $('.gameContainer').width() / FACTORY_WIDTH;
	var x = id % cellWidth;
	var y = Math.floor(id / cellWidth);
	return {x: x, y: y};
}

function savedGameExists() {
	// check html5 storage for game object
	return false;
}

// don't look here
function initHiddenFactories() {
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
		var firstFactory = new Factory();
		$(".gameContainer").append(firstFactory.element);
		factories.push(firstFactory);
}

// http://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}