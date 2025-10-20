/* global Handlebars, utils, dataSource */

{
	('use strict');

	// Handlebars helper for joining array values
	Handlebars.registerHelper('joinValues', function (input, options) {
		return Object.values(input).join(options.fn(this));
	});

	// Handlebars helper for comparing values
	Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
		return arg1 == arg2 ? options.fn(this) : options.inverse(this);
	});

	/* Product class - handles menu product functionality */
	class Product {
		constructor(id, data) {
			const thisProduct = this;
			thisProduct.id = id;
			thisProduct.data = data;
			thisProduct.renderInMenu();
			thisProduct.getElements();
			thisProduct.initAccordion();
			thisProduct.initAmountWidget();
			thisProduct.initOrderForm();
			thisProduct.processOrder();
		}

		renderInMenu() {
			const thisProduct = this;
			// Generate HTML from template
			const generatedHTML = templates.menuProduct(thisProduct.data);
			thisProduct.element = utils.createDOMFromHTML(generatedHTML);
			// Add product to menu container
			const menuContainer = document.querySelector(select.containerOf.menu);
			menuContainer.appendChild(thisProduct.element);
		}

		getElements() {
			const thisProduct = this;
			// Get references to product elements
			thisProduct.accordionTrigger = thisProduct.element.querySelector(
				select.menuProduct.clickable
			);
			thisProduct.form = thisProduct.element.querySelector(
				select.menuProduct.form
			);
			thisProduct.formInputs = thisProduct.form.querySelectorAll(
				select.all.formInputs
			);
			thisProduct.cartButton = thisProduct.element.querySelector(
				select.menuProduct.cartButton
			);
			thisProduct.priceElem = thisProduct.element.querySelector(
				select.menuProduct.priceElem
			);
			thisProduct.imageWrapper = thisProduct.element.querySelector(
				select.menuProduct.imageWrapper
			);
			thisProduct.amountWidgetElem = thisProduct.element.querySelector(
				select.menuProduct.amountWidget
			);
		}

		initAccordion() {
			const thisProduct = this;
			if (!thisProduct.accordionTrigger) return;
			// Toggle product details on click
			thisProduct.accordionTrigger.addEventListener('click', function (event) {
				event.preventDefault();
				// Close other active products
				const activeProduct = document.querySelector(
					select.all.menuProductsActive
				);
				if (activeProduct && activeProduct !== thisProduct.element) {
					activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
				}
				// Toggle current product
				thisProduct.element.classList.toggle(
					classNames.menuProduct.wrapperActive
				);
			});
		}

		initOrderForm() {
			const thisProduct = this;
			// Handle form submission
			thisProduct.form.addEventListener('submit', function (event) {
				event.preventDefault();
				thisProduct.processOrder();
				thisProduct.addToCart();
			});
			// Update price on option change
			for (let input of thisProduct.formInputs) {
				input.addEventListener('change', function () {
					thisProduct.processOrder();
				});
			}
			// Handle "Add to cart" button click
			thisProduct.cartButton.addEventListener('click', function (event) {
				event.preventDefault();
				thisProduct.processOrder();
				thisProduct.addToCart();
			});
		}

		processOrder() {
			const thisProduct = this;
			const formData = utils.serializeFormToObject(thisProduct.form);
			let price = thisProduct.data.price;

			// Calculate price based on selected options
			for (let paramId in thisProduct.data.params) {
				const param = thisProduct.data.params[paramId];
				for (let optionId in param.options) {
					const option = param.options[optionId];
					const optionSelected =
						formData[paramId] && formData[paramId].includes(optionId);
					// Add price if option is selected and not default
					if (optionSelected && !option.default) {
						price += option.price;
					}
					// Subtract price if option is not selected but was default
					if (!optionSelected && option.default) {
						price -= option.price;
					}
					// Show/hide option images
					const optionImage = thisProduct.imageWrapper.querySelector(
						`.${paramId}-${optionId}`
					);
					if (optionImage) {
						if (optionSelected) {
							optionImage.classList.add(classNames.menuProduct.imageVisible);
						} else {
							optionImage.classList.remove(classNames.menuProduct.imageVisible);
						}
					}
				}
			}
			// Save single item price (before multiplying by amount)
			thisProduct.priceSingle = price;
			// Multiply by amount
			if (
				thisProduct.amountWidget &&
				typeof thisProduct.amountWidget.value !== 'undefined'
			) {
				price *= thisProduct.amountWidget.value;
			}
			// Display total price
			thisProduct.priceElem.innerHTML = price;
		}

		initAmountWidget() {
			const thisProduct = this;
			// Create amount widget instance
			thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
			// Update price when amount changes
			thisProduct.amountWidgetElem.addEventListener('updated', function () {
				thisProduct.processOrder();
			});
		}

		prepareCartProduct() {
			const thisProduct = this;
			// Prepare product summary for cart
			const productSummary = {
				id: thisProduct.id,
				name: thisProduct.data.name,
				amount: thisProduct.amountWidget.value,
				priceSingle: thisProduct.priceSingle,
				price: thisProduct.priceSingle * thisProduct.amountWidget.value,
				params: thisProduct.prepareCartProductParams(),
			};
			return productSummary;
		}

		prepareCartProductParams() {
			const thisProduct = this;
			const formData = utils.serializeFormToObject(thisProduct.form);
			const params = {};

			// Collect selected options
			for (let paramId in thisProduct.data.params) {
				const param = thisProduct.data.params[paramId];
				params[paramId] = {
					label: param.label,
					options: {},
				};
				for (let optionId in param.options) {
					const option = param.options[optionId];
					const optionSelected =
						formData[paramId] && formData[paramId].includes(optionId);
					// Add selected option to params
					if (optionSelected) {
						params[paramId].options[optionId] = option.label;
					}
				}
			}
			return params;
		}

		addToCart() {
			const thisProduct = this;
			// Add product to cart
			app.cart.add(thisProduct.prepareCartProduct());
		}
	}

	/* Selectors object - stores CSS selectors for easy reference */
	const select = {
		templateOf: {
			menuProduct: '#template-menu-product',
			cartProduct: '#template-cart-product',
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
		cart: {
			productList: '.cart__order-summary',
			toggleTrigger: '.cart__summary',
			totalNumber: '.cart__total-number',
			totalPrice:
				'.cart__total-price strong, .cart__order-price li:nth-child(3) .cart__order-price-sum strong',
			// FIXED: Using nth-child to target specific price elements
			subtotalPrice:
				'.cart__order-price li:nth-child(1) .cart__order-price-sum',
			deliveryFee: '.cart__order-price li:nth-child(2) .cart__order-price-sum',
			form: '.cart__order',
			formSubmit: '.cart__order [type="submit"]',
			phone: '[name="phone"]',
			address: '[name="address"]',
		},
		cartProduct: {
			amountWidget: '.widget-amount',
			price: '.cart__product-price',
			edit: '[href="#edit"]',
			remove: '[href="#remove"]',
		},
		widgets: {
			amount: {
				// FIXED: Universal selector works in both product and cart
				input: 'input[type="text"]',
				linkDecrease: 'a[href="#less"]',
				linkIncrease: 'a[href="#more"]',
			},
		},
	};

	/* CSS class names used in the app */
	const classNames = {
		menuProduct: {
			wrapperActive: 'active',
			imageVisible: 'active',
		},
		cart: {
			wrapperActive: 'active',
		},
	};

	/* App settings and configuration */
	const settings = {
		amountWidget: {
			defaultValue: 1,
			defaultMin: 0,
			defaultMax: 10,
		},
		cart: {
			defaultDeliveryFee: 20,
		},
	};

	/* Handlebars templates compilation */
	const templates = {
		menuProduct: Handlebars.compile(
			document.querySelector(select.templateOf.menuProduct).innerHTML
		),
		cartProduct: Handlebars.compile(
			document.querySelector(select.templateOf.cartProduct).innerHTML
		),
	};

	/* AmountWidget class - handles quantity input with +/- buttons */
	class AmountWidget {
		constructor(element) {
			const thisWidget = this;
			thisWidget.getElements(element);
			// Set initial value from input or use default
			const startValue =
				thisWidget.input.value !== ''
					? thisWidget.input.value
					: settings.amountWidget.defaultValue;
			thisWidget.setValue(startValue);
			thisWidget.initActions();
		}

		getElements(element) {
			const thisWidget = this;
			// Get references to widget elements
			thisWidget.element = element;
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

		setValue(value) {
			const thisWidget = this;
			const newValue = parseInt(value);
			const min = settings.amountWidget.defaultMin;
			const max = settings.amountWidget.defaultMax;

			// Validate and set new value
			if (
				!isNaN(newValue) &&
				newValue !== thisWidget.value &&
				newValue >= min &&
				newValue <= max
			) {
				thisWidget.value = newValue;
				thisWidget.announce();
			}
			// Update input display
			thisWidget.input.value = thisWidget.value;
		}

		announce() {
			const thisWidget = this;
			// Create custom event with bubbling enabled
			const event = new CustomEvent('updated', {
				bubbles: true,
			});
			thisWidget.element.dispatchEvent(event);
		}

		initActions() {
			const thisWidget = this;
			// Handle manual input change
			thisWidget.input.addEventListener('change', function () {
				thisWidget.setValue(thisWidget.input.value);
			});
			// Handle decrease button click
			thisWidget.linkDecrease.addEventListener('click', function (event) {
				event.preventDefault();
				thisWidget.setValue(thisWidget.value - 1);
			});
			// Handle increase button click
			thisWidget.linkIncrease.addEventListener('click', function (event) {
				event.preventDefault();
				thisWidget.setValue(thisWidget.value + 1);
			});
		}
	}

	/* Cart class - handles shopping cart functionality */
	class Cart {
		constructor(element) {
			const thisCart = this;
			thisCart.products = [];
			thisCart.getElements(element);
			thisCart.initActions();
		}

		getElements(element) {
			const thisCart = this;
			thisCart.dom = {};
			// Get references to cart elements
			thisCart.dom.wrapper = element;
			thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(
				select.cart.toggleTrigger
			);
			thisCart.dom.productList = thisCart.dom.wrapper.querySelector(
				select.cart.productList
			);
			thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(
				select.cart.deliveryFee
			);
			thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(
				select.cart.subtotalPrice
			);
			thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(
				select.cart.totalPrice
			);
			thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(
				select.cart.totalNumber
			);
		}

		initActions() {
			const thisCart = this;
			// Toggle cart visibility on click
			thisCart.dom.toggleTrigger.addEventListener('click', function () {
				thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
			});
			// Update cart totals when product amount changes
			thisCart.dom.productList.addEventListener('updated', function () {
				thisCart.update();
			});
		}

		add(menuProduct) {
			const thisCart = this;
			// Generate HTML for cart product
			const generatedHTML = templates.cartProduct(menuProduct);
			const generatedDOM = utils.createDOMFromHTML(generatedHTML);
			// Add product to cart list
			thisCart.dom.productList.appendChild(generatedDOM);
			// Create CartProduct instance and add to products array
			thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
			// Update cart totals
			thisCart.update();
		}

		update() {
			const thisCart = this;
			const deliveryFee = settings.cart.defaultDeliveryFee;
			let totalNumber = 0;
			let subtotalPrice = 0;

			// Calculate totals from all products
			for (let product of thisCart.products) {
				totalNumber += product.amount;
				subtotalPrice += product.price;
			}

			// Calculate final price (add delivery fee only if cart is not empty)
			if (totalNumber > 0) {
				thisCart.totalPrice = subtotalPrice + deliveryFee;
				thisCart.dom.deliveryFee.innerHTML = deliveryFee;
			} else {
				thisCart.totalPrice = 0;
				thisCart.dom.deliveryFee.innerHTML = 0;
			}

			// Update cart display
			thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;
			thisCart.dom.totalNumber.innerHTML = totalNumber;

			// Update all total price elements
			for (let elem of thisCart.dom.totalPrice) {
				elem.innerHTML = thisCart.totalPrice;
			}
		}
	}

	/* CartProduct class - handles individual product in cart */
	class CartProduct {
		constructor(menuProduct, element) {
			const thisCartProduct = this;
			// Copy product data from menu product
			thisCartProduct.id = menuProduct.id;
			thisCartProduct.name = menuProduct.name;
			thisCartProduct.amount = menuProduct.amount;
			thisCartProduct.priceSingle = menuProduct.priceSingle;
			thisCartProduct.price = menuProduct.price;
			thisCartProduct.params = menuProduct.params;

			thisCartProduct.getElements(element);
			thisCartProduct.initAmountWidget();
			thisCartProduct.initActions(); // ← DODAJ TO!
		}

		getElements(element) {
			const thisCartProduct = this;
			thisCartProduct.dom = {};
			// Get references to cart product elements
			thisCartProduct.dom.wrapper = element;
			thisCartProduct.dom.amountWidget =
				thisCartProduct.dom.wrapper.querySelector(
					select.cartProduct.amountWidget
				);
			thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(
				select.cartProduct.price
			);
			thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(
				select.cartProduct.edit
			);
			thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(
				select.cartProduct.remove
			);
		}

		initAmountWidget() {
			const thisCartProduct = this;
			// Create amount widget for cart product
			thisCartProduct.amountWidget = new AmountWidget(
				thisCartProduct.dom.amountWidget
			);
			// Update price when amount changes
			thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
				thisCartProduct.amount = thisCartProduct.amountWidget.value;
				thisCartProduct.price =
					thisCartProduct.priceSingle * thisCartProduct.amount;
				thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
			});
		}

		remove() {
			const thisCartProduct = this;
			// Create custom event with product reference in detail
			const event = new CustomEvent('remove', {
				bubbles: true,
				detail: {
					cartProduct: thisCartProduct,
				},
			});
			thisCartProduct.dom.wrapper.dispatchEvent(event);
			console.log('Remove called for:', thisCartProduct.name);
		}

		initActions() {
			const thisCartProduct = this;

			// Edit button - prevent default action
			thisCartProduct.dom.edit.addEventListener('click', function (event) {
				event.preventDefault();
				// TODO: Add edit functionality later
			});

			// Remove button - call remove method
			thisCartProduct.dom.remove.addEventListener('click', function (event) {
				event.preventDefault();
				thisCartProduct.remove();
			});
		}
	}

	/* Main app object - initializes the application */
	const app = {
		initData: function () {
			const thisApp = this;
			// Load product data
			thisApp.data = dataSource;
		},
		initMenu: function () {
			const thisApp = this;
			// Create Product instances for each product in data
			for (let productId in thisApp.data.products) {
				new Product(productId, thisApp.data.products[productId]);
			}
		},
		initCart: function () {
			const thisApp = this;
			// Initialize shopping cart
			const cartElem = document.querySelector(select.containerOf.cart);
			thisApp.cart = new Cart(cartElem);
		},
		init: function () {
			const thisApp = this;
			// Initialize all app components
			thisApp.initData();
			thisApp.initMenu();
			thisApp.initCart();
		},
	};

	// Start the app
	app.init();
}
