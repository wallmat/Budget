 //BUDGET CONTROLLER
var budgetController = (function () {

    //object / function constructor to hold the expense data
    var Expense = function(id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
        this.percentage = -1;
    };

    /**
     * Calc the percent of the income that this expense takes up
     */
    Expense.prototype.calcPercentage = function (totalIncome) {
        if (totalIncome > 0) {
            this.percentage = Math.round((this.value / totalIncome) * 100);
        } else {
            this.percentage = -1;
        }
    };

    /**
     * gets the percentage
     */
    Expense.prototype.getPercentage = function() {
        return this.percentage;
    }

    var Income = function(id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
    };

    //data to hold all expenses and income 
    //totals to hold expense and income totals
    var data = {
        allItems: {
            exp: [],
            inc: []
        },
        totals: {
            exp: 0,
            inc: 0
        },
        budget: 0,
        percentage: -1
    };

    /**
     * calculate totals for income and expenses 
     * 'inc' or 'exp'
     * @param {string} type 
     */
    var calculateTotal = function(type) {
        var sum = 0;

        data.allItems[type].forEach(function (item) {
            sum += item.value;
        });

        data.totals[type] = sum;
    }

    return {
        /**
         * Adds a new item to either expense or income
         * @param {string} type 
         * @param {string} dec 
         * @param {number} val 
         */
        addItem: function(type, dec, val) {
            var newItem, ID, allItems;

            //get the last id and add one two it to always keep them moving forward
            //if the array is empty the first index is 0
            if(data.allItems[type].length > 0) {
                ID = data.allItems[type][data.allItems[type].length - 1].id + 1;
            } else {
                ID = 0;
            }

            if(type === 'exp') {
                newItem = new Expense(ID, dec, val);
            } else if (type === 'inc') {
                newItem = new Income(ID, dec, val);
            }

            // [type] works because the all items arrays are named the 
            // same as the values we get from the html
            data.allItems[type].push(newItem);
            return newItem;
        },

        /**
         * Delete an item from the budget data
         * @param {string} type 
         * @param {number} id 
         */
        deleteItem: function(type, id) {
            var ids, index;

            //create a new arr of just the ids
            ids = data.allItems[type].map(function(current) {
                return current.id;
            });
            
            //now get the index of that id
            index = ids.indexOf(id);

            if(index !== -1) {
                data.allItems[type].splice(index, 1);
            }
            else {
                alert('Item not found to remove');
            }
        },

        /**
         * calculates the budget and percent the expenses are taking up
         */
        calculateBudget: function() {
            //calc total income/expenses
            calculateTotal('exp');
            calculateTotal('inc');

            //calc the budget: inc - exp
            data.budget = data.totals.inc - data.totals.exp;

            //calc the % of income spent. Make sure you dont /0
            if(data.totals.inc > 0) {
                data.percentage = Math.round((data.totals.exp / data.totals.inc) * 100);
            } else {
                data.percentage = -1;
            }
        },

        /**
         * calculates the percentage of each expense
         */
        calculatePercentages: function() {
            data.allItems.exp.forEach(function (item) {
                item.calcPercentage(data.totals.inc);
            });
        },

        /**
         *  creates and returns an arr of expense percentages
         */
        getPercentages: function() {
            var allPerc = data.allItems.exp.map(function(item) {
                return item.getPercentage();
            });

            return allPerc;
        },

        /**
         * Get the budget values used to populate the UI
         */
        getBudget: function() {
            return {
                budget: data.budget,
                totalInc: data.totals.inc,
                totalExp: data.totals.exp,
                percentage: data.percentage
            };
        },
        
        /**
         * DEBUG to show the data
         */
        debugShowData: function() {
            console.log(data);
        }
    };
})();

//UI CONTROLLER
var UIController = (function() {
    //group all the names from the html to allow easier changing later if needed
    var DOMStrings = {
        inputType: '.add__type',
        inputDescription: '.add__description',
        inputValue: '.add__value',
        inputBtn: '.add__btn',
        incomeContainer: '.income__list',
        expensesContainer: '.expenses__list',
        budgetLabel: '.budget__value',
        incomeLabel: '.budget__income--value',
        expenseLabel: '.budget__expenses--value',
        percentageLabel: '.budget__expenses--percentage',
        container: '.container',
        expensesPercentageLabel: '.item__percentage',
        dateLabel: '.budget__title--month'
    }

    /**
     * puts commas in the string to read easier
     * @param {number} n 
     */
    numberWithCommas = function(n) {
        var parts=n.toString().split(".");
        return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
    };

    /**
     * this will loop a list of items to get the index an item
     * @param {list<any>} list List<any> items to get loop through
     * @param {function} callback callback to return the item and index
     */
    var nodeListForEach = function(list, callback) {
        for(var i = 0; i < list.length; i++) {
            callback(list[i], i);
        };
    };

    /**
     * Format the number passed in to something more pleasing for budgets
     * @param {number} num  Number to convert
     * @param {string} type inc or exp
     */
    var formatNumber = function (num, type) {
        num = Math.abs(num);
        num = num.toFixed(2);

        num = numberWithCommas(num);

        type === 'exp' ? sign = '-' : sign = '+';

        return (type === 'exp' ? '-' : '+') + ' ' + num;
    };

    return {
        /*
        * get the input from the page
        */
        getInput: function() {
            return {
                //this is a select element so we get on of the options listed in the HTML (inc, exp)
                type: document.querySelector(DOMStrings.inputType).value,
                decription: document.querySelector(DOMStrings.inputDescription).value,
                value: parseFloat(document.querySelector(DOMStrings.inputValue).value)
            };
        },

       /**
        * add new item to the list
        * @param {object containing: id(int), description(string), value(value)} obj 
        * @param {string} type 
        */
        addListItem: function(obj, type) {
            var html, newHtml, element;
            /*create HTML streing with placeholder text
            replace income-0 with inc-%id%. same with %vaue% and %description%
            
            <div class="item clearfix" id="income-0">
                <div class="item__description">Salary</div>
                <div class="right clearfix">
                    <div class="item__value">+ 2,100.00</div>
                    <div class="item__delete">
                        <button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button>
                    </div>
                </div>
            </div>
            */

            if (type === 'inc')
            {
                element = DOMStrings.incomeContainer;
                html = '<div class="item clearfix" id="inc-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">%value%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>'
            } 
            else if (type === 'exp')
            {
                element = DOMStrings.expensesContainer;
                html = '<div class="item clearfix" id="exp-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value">%value%</div><div class="item__percentage">21%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>'
            }
            else
            {
                alert('New unknown budget type passed in, type: ' + type);
                return;
            }

            //replace text with actual data, then replace the rest in the newHtml
            newHtml = html.replace('%id%', obj.id);
            newHtml = newHtml.replace('%description%', obj.description);
            newHtml = newHtml.replace('%value%', formatNumber(obj.value, type));

            //insert the html into the dom
            document.querySelector(element).insertAdjacentHTML('beforeend', newHtml);
        },

        /**
         * Removes the UI budget element when deleted
         * @param {string} selectorID 
         */
        deleteListItem: function(selectorID) {
            //you need to get the parent so you can remove the 'child' 
            var selection = document.getElementById(selectorID);
            selection.parentNode.removeChild(selection);
        },

        /*
        *clear the input fields in the ui
        */
        clearFields: function () {
            var fields;

            fields = document.querySelectorAll(DOMStrings.inputDescription + ', ' + DOMStrings.inputValue);

            //tells slice to treat fields as an arr 
            //instead of list to convert it to an array
            //var fieldsArr = Array.prototype.slice.call(fields);

            // fieldsArr.forEach(function(cur, index, arr) {
            //     cur.value = "";
            // });

            //or just loop on the list
            fields.forEach(element => {
                element.value = "";
            });

            //this moves focus back to the description
            fields[0].focus();
        },

        /**
         * 
         * @param {array} percentages List of percentages to display
         */
        displayPercentages: function(percentages) {
            //returns a Node list
            var fields = document.querySelectorAll(DOMStrings.expensesPercentageLabel);

            nodeListForEach(fields, function(item, index) {
                console.log(percentages[index]);

                if(percentages[index] !== -1) {
                    item.textContent = percentages[index] + '%';
                } else {
                    item.textContent = '---';
                }
            });
        },

        /**
         * updates the UI with the new budget info
         * @param {object : budget} dataObj 
         */
        displayBudget: function (dataObj) {
            var type;
            dataObj.budget > 0 ? type = 'inc' : type = 'exp';

            document.querySelector(DOMStrings.budgetLabel).textContent = formatNumber(dataObj.budget, type);
            document.querySelector(DOMStrings.incomeLabel).textContent = formatNumber( dataObj.totalInc, 'inc');
            document.querySelector(DOMStrings.expenseLabel).textContent = formatNumber(dataObj.totalExp, 'exp');

            if(dataObj.percentage > 0) {
                document.querySelector(DOMStrings.percentageLabel).textContent = dataObj.percentage + '%';
            } else {
                document.querySelector(DOMStrings.percentageLabel).textContent = '---';
            }
        },

        /**
         * Display the month and year 
         */
        displayDate: function() {
            var now, month, months;
            months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            now = new Date();
            month = now.getMonth();

            document.querySelector(DOMStrings.dateLabel).textContent = months[month] + ' ' + now.getFullYear();
        },

        changedType: function() {
            var fields = document.querySelectorAll(
                DOMStrings.inputType + ',' +
                DOMStrings.inputDescription + ',' + 
                DOMStrings.inputValue);

            nodeListForEach(fields, function(cur) {
                cur.classList.toggle('red-focus');
            });

            document.querySelector(DOMStrings.inputBtn).classList.toggle('red');
        },

        /*
        * get the strings to share
        */
        getDOMStrings: function () {
            return DOMStrings;
        }
    };
})();

//MAIN APP CONTROLLER
//pass in the controllers to keep seporation of concerns (dependency injection)
var controller = (function (budgetCtrl, UICtrl) {

    /**
     * sets up the event listeners, and gets the dom strings to use
     */
    var setupEventListeners = function () {
        //get the strings from the ui controller
        var DOM = UICtrl.getDOMStrings();

        //on click to add another budget item.
        document.querySelector(DOM.inputBtn).addEventListener('click', ctrlAddItem);

        //this adds event to the global document
        document.addEventListener('keypress', function (eventData) {
            //13 is return, which is for older browsers
            if (eventData.keyCode === 13 || eventData.which === 13)
            {
                ctrlAddItem();
            }
        });

        document.querySelector(DOM.container).addEventListener('click', ctrlDeleteItem);

        document.querySelector(DOM.inputType).addEventListener('change', UICtrl.changedType);
    };

    /**
     * updates the budget when new items are added
     */
    var updateBudget = function() {
        //1. calculate the new budget
        budgetCtrl.calculateBudget();

        //2. return new budget
        var budget = budgetCtrl.getBudget();

        //3. update new budget UI
        UICtrl.displayBudget(budget);
    };

    var updatePercentages = function() {
        //1. calc the percents
        budgetCtrl.calculatePercentages();

        //2. read them from the controller
        var percentages = budgetCtrl.getPercentages();

        //3. update the UI
        UICtrl.displayPercentages(percentages);
    };

    /**
     * Adds a new item on keypress (return) or the check mark button
     */
    var ctrlAddItem = function () {
        var input, newItem;

        //1. get data from page
        input = UICtrl.getInput();

        //if we get back a bad input object
        if(input.decription === "" || isNaN(input.value) || input.value <= 0) 
            return;

        //2. add item to budget controller
        newItem = budgetCtrl.addItem(input.type, input.decription, input.value);

        //3. update UI
        UICtrl.addListItem(newItem, input.type);

        //4. clear they input fields
        UICtrl.clearFields();

        //5. update the budget and the ui
        updateBudget();

        //6. update percents
        updatePercentages();
    };

    /**
     * deletes the Income or Expense item
     * @param {event} event 
     */
    var ctrlDeleteItem = function(event) {
        var itemID, splitId, type, ID;

        //we need to traverse upwards 4 parents based on the layout of the HMTL and get the id this
        //isnt good but the dom structure is hardcoded and added dynamically too so it works for this
        itemID = event.target.parentNode.parentNode.parentNode.parentNode.id;

        if(itemID) {
            //inc-x or exp-x
            splitId = itemID.split('-');
            type = splitId[0];
            ID = parseInt(splitId[1]); //make sure its not a string

            //1. delete the item from data
            budgetCtrl.deleteItem(type, ID);

            //2. delete from UI
            UICtrl.deleteListItem(itemID);

            //3. Update and show new budget data
            updateBudget();

            //4. update percents
            updatePercentages();
        }
    };

    return {
        init: function() {
            console.log('Application Started');
            setupEventListeners();

            UICtrl.displayDate();

            //set the defaults to 0
            UICtrl.displayBudget({
                budget: 0,
                totalInc: 0,
                totalExp: 0,
                percentage: -1
            });
        }
    }

})(budgetController, UIController);

//we need to init everything or nothing will work
controller.init();



