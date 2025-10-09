/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  // Product class
  class Product {
    constructor(id, data) {
      const thisProduct = this;

      // Save constructor arguments on the instance
      thisProduct.id = id;
      thisProduct.data = data;

      // Render product in the menu (creates thisProduct.element)
      thisProduct.renderInMenu();

      // Cache DOM references for later use
      thisProduct.getElements();

      // Initialize accordion behavior right after rendering
      thisProduct.initAccordion();

      /* NEW 8.x: create AmountWidget instance for this product */
      thisProduct.initAmountWidget();

      // Call other methods required by the task
      thisProduct.initOrderForm();
      thisProduct.processOrder();

      console.log('new Product:', thisProduct);
    }

    // Render this product into the menu
    renderInMenu() {
      const thisProduct = this;

      /* generate HTML based on template */
      const generatedHTML = templates.menuProduct(thisProduct.data);

      /* create element using utils.createDOMFromHTML */
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      /* find menu container */
      const menuContainer = document.querySelector(select.containerOf.menu);

      /* append element to menu */
      menuContainer.appendChild(thisProduct.element);
    }

    // Collect and cache DOM references (run once per product)
    getElements() {
      const thisProduct = this;

      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);

      /* NEW 7.7: wrapper with product images */
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);

      /* NEW 8.x: wrapper with amount widget */
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    // Sets up accordion
    initAccordion() {
      const thisProduct = this;

      // Use the reference prepared in getElements()
      if (!thisProduct.accordionTrigger) return;

      thisProduct.accordionTrigger.addEventListener('click', function (event) {
        // prevent default action for event
        event.preventDefault();

        // find active product (product that has active class)
        const activeProduct = document.querySelector(select.all.menuProductsActive);

        // if there is active product and it's not thisProduct.element, remove class active from it
        if (activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

        // toggle active class on thisProduct.element
        thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
      });
    }

    // Add event listeners to the form, its inputs, and the add-to-cart button
    initOrderForm() {
      const thisProduct = this;

      // Prevent default form submission and recompute price
      thisProduct.form.addEventListener('submit', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });

      // Recompute price on any input change
      for (let input of thisProduct.formInputs) {
        input.addEventListener('change', function () {
          thisProduct.processOrder();
        });
      }

      // Prevent default link behavior and recompute price on add-to-cart click
      thisProduct.cartButton.addEventListener('click', function (event) {
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    // Compute order and update price
    processOrder() {
      const thisProduct = this;

      /* NEW: read current form values as a plain object, e.g.
         { sauce: ['tomato'], toppings: ['olives','salami'] } */
      const formData = utils.serializeFormToObject(thisProduct.form);

      /* NEW: start from the base price (includes defaults) */
      let price = thisProduct.data.price;

      /* NEW: go through every param and its options */
      for (let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        for (let optionId in param.options) {
          const option = param.options[optionId];

          // Is this option selected in the form?
          const optionSelected =
            formData[paramId] && formData[paramId].includes(optionId);

          // Pricing rules:
          // - selected & not default  -> add
          if (optionSelected && !option.default) {
            price += option.price;
          }
          // - not selected & default -> subtract
          if (!optionSelected && option.default) {
            price -= option.price;
          }

          /* NEW 7.7: show / hide matching image */
          const optionImage = thisProduct.imageWrapper.querySelector(`.${paramId}-${optionId}`);
          if (optionImage) {
            if (optionSelected) {
              optionImage.classList.add(classNames.menuProduct.imageVisible);
            } else {
              optionImage.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
        }
      }

      /* NEW: multiply by chosen amount from the AmountWidget */
      if (thisProduct.amountWidget && typeof thisProduct.amountWidget.value !== 'undefined') {
        price *= thisProduct.amountWidget.value;
      }

      /* NEW: write the final price to the DOM */
      thisProduct.priceElem.innerHTML = price;
    }

    /* NEW 8.x: initialize AmountWidget for this product */
    initAmountWidget() {
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);

      /* NEW: listen for the custom 'updated' event and recompute price */
      thisProduct.amountWidgetElem.addEventListener('updated', function () {
        thisProduct.processOrder();
      });
    }
  }

  // Centralized selectors used across the app
  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  // CSS class names used by JS
  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
  };

  // Global settings for widgets/features
  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 0,
      defaultMax: 10,
    },
  };

  // Precompile Handlebars templates (expects #template-menu-product in HTML)
  const templates = {
    menuProduct: Handlebars.compile(
      document.querySelector(select.templateOf.menuProduct).innerHTML
    ),
  };

  // NEW 8.x: Minimal AmountWidget class (with initialization + validation + custom event)
  class AmountWidget {
    constructor(element) {
      const thisWidget = this;

      /* collect inner elements of the widget (+, −, input) */
      thisWidget.getElements(element);

     // NEW: if input has a value, use it; otherwise use default from settings
     const startValue = thisWidget.input.value !== '' 
      ? thisWidget.input.value 
      : settings.amountWidget.defaultValue;
      thisWidget.setValue(startValue);


      /* wire up widget event listeners */
      thisWidget.initActions();

      // Logs to verify the constructor runs for each product
      console.log('AmountWidget:', thisWidget);
      console.log('constructor arguments:', element);
    }

    /* cache DOM references used by this widget */
    getElements(element) {
      const thisWidget = this;

      // Save main wrapper
      thisWidget.element = element;

      // Find inner controls inside the wrapper
      thisWidget.input = thisWidget.element.querySelector(
        select.widgets.amount.input
      );
      thisWidget.linkDecrease = thisWidget.element.querySelector(
        select.widgets.amount.linkDecrease
      );
      thisWidget.linkIncrease = thisWidget.element.querySelector(
        select.widgets.amount.linkIncrease
      );
    }

    // set value in a controlled way (with basic validation + range)
    setValue(value) {
      const thisWidget = this;

      const newValue = parseInt(value);
      const min = settings.amountWidget.defaultMin;
      const max = settings.amountWidget.defaultMax;

      // accept only numbers, changed, and within [min, max]
      if (
        !isNaN(newValue) &&
        newValue !== thisWidget.value &&
        newValue >= min && newValue <= max
      ) {
        thisWidget.value = newValue;
        thisWidget.announce(); /* NEW: tell listeners that a valid change happened */
      }

      // Keep the input display in sync with the internal value
      thisWidget.input.value = thisWidget.value;
    }

     /* NEW: emit a custom event so Product knows about valid changes */
      announce() {
       const thisWidget = this;
       const event = new Event('updated');   
       thisWidget.element.dispatchEvent(event);
      }

    /* set up event listeners for input and +/- links */
    initActions() {
      const thisWidget = this;

      // When user types in the input, try to set that value
      thisWidget.input.addEventListener('change', function () {
        thisWidget.setValue(thisWidget.input.value);
      });

      // When user clicks "-", decrease by 1
      thisWidget.linkDecrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value - 1);
      });

      // When user clicks "+", increase by 1
      thisWidget.linkIncrease.addEventListener('click', function (event) {
        event.preventDefault();
        thisWidget.setValue(thisWidget.value + 1);
      });
    }
  }

  // Main application object
  const app = {
    // Load initial data into app.data from the global dataSource
    // IMPORTANT: this must run before building the menu
    initData: function () {
      const thisApp = this;
      thisApp.data = dataSource;
      console.log('data:', thisApp.data); // check in console that products exist
    },

    // Build the menu: iterate over products and create a Product for each
    // We do NOT store the instances (not needed at this step)
    initMenu: function () {
      const thisApp = this;
      for (let productId in thisApp.data.products) {
        new Product(productId, thisApp.data.products[productId]);
      }
    },

    // App entry point: log basics, then load data and build the menu
    init: function () {
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      // Order matters: first load data, then create products
      thisApp.initData();
      thisApp.initMenu();
    },
  };

  // Start the app
  app.init();
}
