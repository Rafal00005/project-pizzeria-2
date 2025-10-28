import DatePicker from './components/DatePicker.js';
import HourPicker from './components/HourPicker.js';
import BaseWidget from './components/BaseWidget.js';

/* global Handlebars, utils */

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
		//app.cart.add(thisProduct.prepareCartProduct());
		const event = new CustomEvent('add-to-cart', {
			bubbles: true,
			detail: {
				product: thisProduct.prepareCartProduct(),
			},
		});
		thisProduct.element.dispatchEvent(event);
	}
}

/* Selectors object - stores CSS selectors for easy reference */
const select = {
	templateOf: {
		menuProduct: '#template-menu-product',
		cartProduct: '#template-cart-product',
		bookingWidget: '#template-booking-widget',
	},
	containerOf: {
		menu: '#product-list',
		cart: '#cart',
		pages: '#pages',
		booking: '.booking-wrapper',
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
		subtotalPrice: '.cart__order-price li:nth-child(1) .cart__order-price-sum',
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
			input: 'input[type="text"]',
			linkDecrease: 'a[href="#less"]',
			linkIncrease: 'a[href="#more"]',
		},
		datePicker: {
			wrapper: '.date-picker',
			input: 'input[name="date"]',
		},
		hourPicker: {
			wrapper: '.hour-picker',
			input: 'input[type="range"]',
			output: '.output',
		},
	},
	booking: {
		peopleAmount: '.people-amount',
		hoursAmount: '.hours-amount',
		tables: '.floor-plan .table',
	},
	nav: {
		links: '.main-nav a',
	},
};

/* Class names object - stores CSS class names */
const classNames = {
	menuProduct: {
		wrapperActive: 'active',
		imageVisible: 'active',
	},
	cart: {
		wrapperActive: 'active',
	},
	booking: {
		loading: 'loading',
		tableBooked: 'booked',
	},
	nav: {
		active: 'active',
	},
	pages: {
		active: 'active',
	},
};

/* Settings */
const settings = {
	amountWidget: {
		defaultValue: 1,
		defaultMin: 1,
		defaultMax: 9,
	},
	cart: {
		defaultDeliveryFee: 20,
	},
	db: {
		url: '//localhost:3131',
		products: 'products',
		orders: 'orders',
		bookings: 'bookings',
		events: 'events',
		dateStartParamKey: 'date_gte',
		dateEndParamKey: 'date_lte',
		notRepeatParam: 'repeat=false',
		repeatParam: 'repeat_ne=false',
	},
	hours: {
		open: 12,
		close: 24,
	},
	datePicker: {
		maxDaysInFuture: 14,
	},
	booking: {
		tableIdAttribute: 'data-table',
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
	bookingWidget: Handlebars.compile(
		document.querySelector(select.templateOf.bookingWidget).innerHTML
	),
};
// Expose config and helpers globally for widgets (DatePicker / HourPicker)
window.select = select;
window.settings = settings;
window.utils = utils;
window.templates = templates;
/* AmountWidget - dziedziczy po BaseWidget */
class AmountWidget extends BaseWidget {
	constructor(element) {
		super(element, settings.amountWidget.defaultValue);
		const thisWidget = this;
		thisWidget.getElements(element);

		const startValue =
			thisWidget.input && thisWidget.input.value !== ''
				? thisWidget.input.value
				: settings.amountWidget.defaultValue;

		thisWidget.setValue(startValue);
		thisWidget.initActions();
	}

	getElements(element) {
		const thisWidget = this;
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

	// nadpisania specyficzne dla liczb
	parseValue(value) {
		return parseInt(value);
	}
	isValid(value) {
		const min = settings.amountWidget.defaultMin;
		const max = settings.amountWidget.defaultMax;
		return !isNaN(value) && value >= min && value <= max;
	}
	renderValue() {
		const thisWidget = this;
		if (thisWidget.input) thisWidget.input.value = thisWidget.value;
	}

	initActions() {
		const thisWidget = this;
		thisWidget.input.addEventListener('change', function () {
			thisWidget.setValue(thisWidget.input.value);
		});
		thisWidget.linkDecrease.addEventListener('click', function (event) {
			event.preventDefault();
			thisWidget.setValue(thisWidget.value - 1);
		});
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
		// Get all elements matching totalPrice selector
		thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(
			select.cart.totalPrice
		);
		thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(
			select.cart.deliveryFee
		);
		thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(
			select.cart.subtotalPrice
		);
		thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(
			select.cart.totalNumber
		);
		thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
		thisCart.dom.address = thisCart.dom.wrapper.querySelector(
			select.cart.address
		);
		thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
	}

	initActions() {
		const thisCart = this;
		// Toggle cart visibility on click
		thisCart.dom.toggleTrigger.addEventListener('click', function () {
			thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
		});

		// Update totals when any product amount changes
		thisCart.dom.productList.addEventListener('updated', function () {
			thisCart.update();
		});

		// Handle remove product event
		thisCart.dom.productList.addEventListener('remove', function (event) {
			thisCart.remove(event.detail.cartProduct);
		});

		// Handle form submission
		thisCart.dom.form.addEventListener('submit', function (event) {
			event.preventDefault();
			thisCart.sendOrder();
		});
	}

	add(menuProduct) {
		const thisCart = this;
		// Generate HTML for cart product
		const generatedHTML = templates.cartProduct(menuProduct);
		const generatedDOM = utils.createDOMFromHTML(generatedHTML);
		// Add to DOM
		thisCart.dom.productList.appendChild(generatedDOM);
		// Create CartProduct instance
		thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
		// Update totals
		thisCart.update();
	}

	update() {
		const thisCart = this;
		const deliveryFee = settings.cart.defaultDeliveryFee;
		thisCart.totalNumber = 0;
		thisCart.subtotalPrice = 0;

		// Calculate totals from all products
		for (let product of thisCart.products) {
			thisCart.totalNumber += product.amount;
			thisCart.subtotalPrice += product.price;
		}

		// Calculate final price (add delivery fee only if cart is not empty)
		if (thisCart.totalNumber > 0) {
			thisCart.totalPrice = thisCart.subtotalPrice + deliveryFee;
			thisCart.dom.deliveryFee.innerHTML = deliveryFee;
		} else {
			thisCart.totalPrice = 0;
			thisCart.dom.deliveryFee.innerHTML = 0;
		}

		// Update cart display
		thisCart.dom.subtotalPrice.innerHTML = thisCart.subtotalPrice;
		thisCart.dom.totalNumber.innerHTML = thisCart.totalNumber;

		// Update all total price elements
		for (let elem of thisCart.dom.totalPrice) {
			elem.innerHTML = thisCart.totalPrice;
		}
	}

	remove(cartProduct) {
		const thisCart = this;
		// Remove from DOM
		cartProduct.dom.wrapper.remove();
		// Remove from products array
		const index = thisCart.products.indexOf(cartProduct);
		if (index > -1) {
			thisCart.products.splice(index, 1);
		}
		// Update totals
		thisCart.update();
	}

	// Send order to API
	sendOrder() {
		const thisCart = this;

		const url = settings.db.url + '/' + settings.db.orders;

		const payload = {
			address: thisCart.dom.address.value,
			phone: thisCart.dom.phone.value,
			totalPrice: thisCart.totalPrice,
			subtotalPrice: thisCart.subtotalPrice,
			totalNumber: thisCart.totalNumber,
			deliveryFee: settings.cart.defaultDeliveryFee,
			products: [],
		};

		for (let prod of thisCart.products) {
			payload.products.push(prod.getData());
		}

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		};

		fetch(url, options)
			.then(function (response) {
				return response.json();
			})
			.then(function (parsedResponse) {
				console.log('Order sent successfully:', parsedResponse);
			});
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
		thisCartProduct.initActions();
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
	getData() {
		const thisCartProduct = this;

		return {
			id: thisCartProduct.id,
			amount: thisCartProduct.amount,
			price: thisCartProduct.price,
			priceSingle: thisCartProduct.priceSingle,
			name: thisCartProduct.name,
			params: thisCartProduct.params,
		};
	}
}
/* Booking - renders template and initializes widgets (date, hour, people, hours) */
class Booking {
	constructor(bookingContainer) {
		const thisBooking = this;
		thisBooking.selectedTable = null;
		thisBooking.render(bookingContainer);
		thisBooking.initWidgets();
		thisBooking.getData();
	}

	getData() {
		const thisBooking = this;

		// Prepare date parameters (from today to +14 days)
		const startDateParam =
			settings.db.dateStartParamKey +
			'=' +
			utils.dateToStr(thisBooking.datePicker.minDate);
		const endDateParam =
			settings.db.dateEndParamKey +
			'=' +
			utils.dateToStr(thisBooking.datePicker.maxDate);

		// Prepare parameters for each query
		const params = {
			booking: [startDateParam, endDateParam],
			eventsCurrent: [settings.db.notRepeatParam, startDateParam, endDateParam],
			eventsRepeat: [settings.db.repeatParam, endDateParam],
		};

		console.log('getData params', params);

		// Build complete URLs
		const urls = {
			booking:
				settings.db.url +
				'/' +
				settings.db.bookings +
				'?' +
				params.booking.join('&'),
			eventsCurrent:
				settings.db.url +
				'/' +
				settings.db.events +
				'?' +
				params.eventsCurrent.join('&'),
			eventsRepeat:
				settings.db.url +
				'/' +
				settings.db.events +
				'?' +
				params.eventsRepeat.join('&'),
		};

		console.log('getData urls', urls);

		// Execute 3 requests in parallel
		Promise.all([
			fetch(urls.booking),
			fetch(urls.eventsCurrent),
			fetch(urls.eventsRepeat),
		])
			.then(function (allResponses) {
				const bookingsResponse = allResponses[0];
				const eventsCurrentResponse = allResponses[1];
				const eventsRepeatResponse = allResponses[2];
				return Promise.all([
					bookingsResponse.json(),
					eventsCurrentResponse.json(),
					eventsRepeatResponse.json(),
				]);
			})
			.then(function ([bookings, eventsCurrent, eventsRepeat]) {
				console.log('bookings', bookings);
				console.log('eventsCurrent', eventsCurrent);
				console.log('eventsRepeat', eventsRepeat);

				// Process fetched data
				thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
			});
	}

	parseData(bookings, eventsCurrent, eventsRepeat) {
		const thisBooking = this;

		// Initialize empty booked object
		thisBooking.booked = {};

		// Process regular bookings
		for (let item of bookings) {
			thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
		}

		// Process one-time events
		for (let item of eventsCurrent) {
			thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
		}

		// Process recurring events - for every day in date range
		const minDate = thisBooking.datePicker.minDate;
		const maxDate = thisBooking.datePicker.maxDate;

		for (let item of eventsRepeat) {
			if (item.repeat == 'daily') {
				for (
					let loopDate = minDate;
					loopDate <= maxDate;
					loopDate = utils.addDays(loopDate, 1)
				) {
					thisBooking.makeBooked(
						utils.dateToStr(loopDate),
						item.hour,
						item.duration,
						item.table
					);
				}
			}
		}

		console.log('thisBooking.booked', thisBooking.booked);

		// Update DOM to show current availability
		thisBooking.updateDOM();
	}

	makeBooked(date, hour, duration, table) {
		const thisBooking = this;

		// If date doesn't exist in booked object, create empty object
		if (typeof thisBooking.booked[date] == 'undefined') {
			thisBooking.booked[date] = {};
		}

		const startHour = utils.hourToNumber(hour);

		// If hour doesn't exist for this date, create empty array
		if (typeof thisBooking.booked[date][startHour] === 'undefined') {
			thisBooking.booked[date][startHour] = [];
		}

		// Add table to booked array
		thisBooking.booked[date][startHour].push(table);

		// Loop through all half-hour blocks for the duration
		for (
			let hourBlock = startHour;
			hourBlock < startHour + duration;
			hourBlock += 0.5
		) {
			// If this hour block doesn't exist yet, create empty array
			if (typeof thisBooking.booked[date][hourBlock] === 'undefined') {
				thisBooking.booked[date][hourBlock] = [];
			}

			// Add table to this hour block
			thisBooking.booked[date][hourBlock].push(table);
		}
	}

	updateDOM() {
		const thisBooking = this;
		// Use event delegation: find the nearest ".table" element even if a child was clicked.

		if (thisBooking.selectedTable !== null) {
			const prev = thisBooking.dom.wrapper.querySelector('.selected');
			if (prev) prev.classList.remove('selected');
			thisBooking.selectedTable = null;
		}

		// Get current date and hour from widgets
		thisBooking.date = thisBooking.datePicker.value;
		thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

		let allAvailable = false;

		// Check if there are any bookings for this date/hour
		if (
			typeof thisBooking.booked[thisBooking.date] == 'undefined' ||
			typeof thisBooking.booked[thisBooking.date][thisBooking.hour] ===
				'undefined'
		) {
			allAvailable = true;
		}

		// For each table on the floor plan
		for (let table of thisBooking.dom.tables) {
			let tableId = table.getAttribute(settings.booking.tableIdAttribute);
			if (!isNaN(tableId)) {
				tableId = parseInt(tableId);
			}

			// If table is booked at this time, add 'booked' class
			if (
				!allAvailable &&
				thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
			) {
				table.classList.add(classNames.booking.tableBooked);
			} else {
				// If table is available, remove 'booked' class
				table.classList.remove(classNames.booking.tableBooked);
			}
		}
	}

	render(bookingContainer) {
		const thisBooking = this;
		thisBooking.dom = {};
		thisBooking.dom.wrapper = bookingContainer;

		// Render template
		thisBooking.dom.wrapper.innerHTML = templates.bookingWidget();

		// Get references to widget wrappers
		thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(
			select.widgets.datePicker.wrapper
		);
		thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(
			select.widgets.hourPicker.wrapper
		);

		// Get references to amount widgets
		thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(
			select.booking.peopleAmount
		);
		thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(
			select.booking.hoursAmount
		);

		// Get references to all tables
		thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(
			select.booking.tables
		);
		//Grt refernce to floor plan container for table selection
		thisBooking.dom.floorPlan =
			thisBooking.dom.wrapper.querySelector('.floor-plan');
		// Get references to booking form elements
		thisBooking.dom.form =
			thisBooking.dom.wrapper.querySelector('.booking-form');
		thisBooking.dom.phone =
			thisBooking.dom.wrapper.querySelector('[name="phone"]');
		thisBooking.dom.address =
			thisBooking.dom.wrapper.querySelector('[name="address"]');
		thisBooking.dom.starters =
			thisBooking.dom.wrapper.querySelectorAll('[name="starter"]');
	}

	initWidgets() {
		const thisBooking = this;

		// Save references to widget instances
		thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
		thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
		thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
		thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

		// Listen for updates from widgets (date/hour changes)
		thisBooking.dom.wrapper.addEventListener('updated', function () {
			thisBooking.updateDOM();
		});

		// Listen for table clicks
		thisBooking.dom.floorPlan.addEventListener('click', function (event) {
			thisBooking.initTables(event);
		});
		// Listen for form submission
		thisBooking.dom.form.addEventListener('submit', function (event) {
			event.preventDefault();
			thisBooking.sendBooking();
		});
	}

	initTables(event) {
		const thisBooking = this;

		// Check if clicked element is a table
		const clickedElement = event.target;

		if (clickedElement.classList.contains('table')) {
			// Get table ID
			const tableId = clickedElement.getAttribute(
				settings.booking.tableIdAttribute
			);

			// Check if table is booked
			if (clickedElement.classList.contains(classNames.booking.tableBooked)) {
				alert('This table is already booked!');
			} else {
				// Remove 'selected' from previously selected table
				const selectedTable =
					thisBooking.dom.wrapper.querySelector('.selected');
				if (selectedTable) {
					selectedTable.classList.remove('selected');
				}

				// If clicked same table again, deselect it
				if (thisBooking.selectedTable === parseInt(tableId)) {
					thisBooking.selectedTable = null;
				} else {
					// Select new table
					clickedElement.classList.add('selected');
					thisBooking.selectedTable = parseInt(tableId);
				}
			}

			console.log('Selected table:', thisBooking.selectedTable);
		}
	}

	sendBooking() {
		const thisBooking = this;

		// Build API URL
		const url = settings.db.url + '/' + settings.db.bookings;

		//Save table number before it gets reset
		const selectedTable = thisBooking.selectedTable;

		// Prepare payload object
		const payload = {
			date: thisBooking.datePicker.value,
			hour: thisBooking.hourPicker.value,
			table: selectedTable,
			duration: parseInt(thisBooking.hoursAmount.value),
			ppl: parseInt(thisBooking.peopleAmount.value),
			starters: [],
			phone: thisBooking.dom.phone.value,
			address: thisBooking.dom.address.value,
		};

		// Collect selected starters from checkboxes
		for (let starter of thisBooking.dom.starters) {
			if (starter.checked) {
				payload.starters.push(starter.value);
			}
		}

		console.log('Sending booking:', payload);

		// Send POST request to API
		fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
			.then(function (response) {
				return response.json();
			})
			.then(function (parsedResponse) {
				console.log('Booking saved:', parsedResponse);

				// Add new booking to thisBooking.booked so it shows as booked immediately
				thisBooking.makeBooked(
					payload.date,
					payload.hour,
					payload.duration,
					payload.table
				);

				// Update DOM to show the new booking
				thisBooking.updateDOM();
			});
	}
}

/* Main app object - initializes the application */
const app = {
	initData: function () {
		const thisApp = this;

		// Initialize empty data object
		thisApp.data = {};

		// Build API endpoint URL
		const url = settings.db.url + '/' + settings.db.products;

		// Fetch products from API asynchronously
		fetch(url)
			.then(function (rawResponse) {
				// Convert response to JSON
				return rawResponse.json();
			})
			.then(function (parsedResponse) {
				console.log('parsedResponse', parsedResponse);

				// Save parsed response as thisApp.data.products
				// Convert array to object with id keys
				thisApp.data.products = {};
				for (let product of parsedResponse) {
					thisApp.data.products[product.id] = product;
				}

				console.log('thisApp.data', thisApp.data);

				// Execute initMenu method after data is loaded
				thisApp.initMenu();
			});

		// This log runs before fetch completes (asynchronous)
		console.log('thisApp.data', JSON.stringify(thisApp.data));
	},

	initMenu: function () {
		const thisApp = this;
		// Create Product instances from API data
		for (let productId in thisApp.data.products) {
			new Product(productId, thisApp.data.products[productId]);
		}
	},

	initCart: function () {
		const thisApp = this;
		// Initialize shopping cart
		const cartElem = document.querySelector(select.containerOf.cart);
		thisApp.cart = new Cart(cartElem);

		// Listen for add-to-cart events
		const productList = document.querySelector(select.containerOf.menu);
		productList.addEventListener('add-to-cart', function (event) {
			thisApp.cart.add(event.detail.product);
		});
	},

	initBooking: function () {
		const thisApp = this;
		const bookingContainer = document.querySelector(select.containerOf.booking);
		if (bookingContainer) {
			thisApp.booking = new Booking(bookingContainer);
		}
	},

	initPages: function () {
		const thisApp = this;

		thisApp.pages = document.querySelector(select.containerOf.pages).children;
		thisApp.navLinks = document.querySelectorAll(select.nav.links);

		const idFromHash = window.location.hash.replace('#/', '');

		let pageMatchingHash = thisApp.pages[0].id;

		for (let page of thisApp.pages) {
			if (page.id == idFromHash) {
				pageMatchingHash = page.id;
				break;
			}
		}

		thisApp.activatePage(pageMatchingHash);

		for (let link of thisApp.navLinks) {
			link.addEventListener('click', function (event) {
				const clickedElement = this;
				event.preventDefault();

				const id = clickedElement.getAttribute('href').replace('#', '');
				thisApp.activatePage(id);
				window.location.hash = '#/' + id;
			});
		}
	},

	activatePage: function (pageId) {
		const thisApp = this;

		for (let page of thisApp.pages) {
			page.classList.toggle(classNames.pages.active, page.id == pageId);
		}

		for (let link of thisApp.navLinks) {
			link.classList.toggle(
				classNames.nav.active,
				link.getAttribute('href') == '#' + pageId
			);
		}
	},

	init: function () {
		const thisApp = this;
		// Initialize all app components
		thisApp.initPages();
		thisApp.initData();
		thisApp.initCart();
		thisApp.initBooking();
	},
};
// Start the app
app.init();
// DEBUG: expose app for console usage when using type="module"
if (typeof window !== 'undefined') {
	window.app = app;
}
