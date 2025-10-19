/* global Handlebars, utils, dataSource */

{
	('use strict');

	Handlebars.registerHelper('joinValues', function (input, options) {
		return Object.values(input).join(options.fn(this));
	});

	Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
		return arg1 == arg2 ? options.fn(this) : options.inverse(this);
	});

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
			const generatedHTML = templates.menuProduct(thisProduct.data);
			thisProduct.element = utils.createDOMFromHTML(generatedHTML);
			const menuContainer = document.querySelector(select.containerOf.menu);
			menuContainer.appendChild(thisProduct.element);
		}

		getElements() {
			const thisProduct = this;
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
			thisProduct.accordionTrigger.addEventListener('click', function (event) {
				event.preventDefault();
				const activeProduct = document.querySelector(
					select.all.menuProductsActive
				);
				if (activeProduct && activeProduct !== thisProduct.element) {
					activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
				}
				thisProduct.element.classList.toggle(
					classNames.menuProduct.wrapperActive
				);
			});
		}

		initOrderForm() {
			const thisProduct = this;
			thisProduct.form.addEventListener('submit', function (event) {
				event.preventDefault();
				thisProduct.processOrder();
				thisProduct.addToCart();
			});
			for (let input of thisProduct.formInputs) {
				input.addEventListener('change', function () {
					thisProduct.processOrder();
				});
			}
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
			for (let paramId in thisProduct.data.params) {
				const param = thisProduct.data.params[paramId];
				for (let optionId in param.options) {
					const option = param.options[optionId];
					const optionSelected =
						formData[paramId] && formData[paramId].includes(optionId);
					if (optionSelected && !option.default) {
						price += option.price;
					}
					if (!optionSelected && option.default) {
						price -= option.price;
					}
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
			thisProduct.priceSingle = price;
			if (
				thisProduct.amountWidget &&
				typeof thisProduct.amountWidget.value !== 'undefined'
			) {
				price *= thisProduct.amountWidget.value;
			}
			thisProduct.priceElem.innerHTML = price;
		}

		initAmountWidget() {
			const thisProduct = this;
			thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
			thisProduct.amountWidgetElem.addEventListener('updated', function () {
				thisProduct.processOrder();
			});
		}

		prepareCartProduct() {
			const thisProduct = this;
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
					if (optionSelected) {
						params[paramId].options[optionId] = option.label;
					}
				}
			}
			return params;
		}

		addToCart() {
			const thisProduct = this;
			app.cart.add(thisProduct.prepareCartProduct());
		}
	}

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
			totalPrice: '.cart__total-price strong',
			subtotalPrice: '.cart__order-total .cart__order-price-sum strong',
			deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
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
				input: 'input[name="amount"]',
				linkDecrease: 'a[href="#less"]',
				linkIncrease: 'a[href="#more"]',
			},
		},
	};

	const classNames = {
		menuProduct: {
			wrapperActive: 'active',
			imageVisible: 'active',
		},
		cart: {
			wrapperActive: 'active',
		},
	};

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

	const templates = {
		menuProduct: Handlebars.compile(
			document.querySelector(select.templateOf.menuProduct).innerHTML
		),
		cartProduct: Handlebars.compile(
			document.querySelector(select.templateOf.cartProduct).innerHTML
		),
	};

	class AmountWidget {
		constructor(element) {
			const thisWidget = this;
			thisWidget.getElements(element);
			const startValue =
				thisWidget.input.value !== ''
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

		setValue(value) {
			const thisWidget = this;
			const newValue = parseInt(value);
			const min = settings.amountWidget.defaultMin;
			const max = settings.amountWidget.defaultMax;
			if (
				!isNaN(newValue) &&
				newValue !== thisWidget.value &&
				newValue >= min &&
				newValue <= max
			) {
				thisWidget.value = newValue;
				thisWidget.announce();
			}
			thisWidget.input.value = thisWidget.value;
		}

		announce() {
			const thisWidget = this;
			const event = new CustomEvent('updated', {
				bubbles: true,
			});
			thisWidget.element.dispatchEvent(event);
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
			thisCart.dom.toggleTrigger.addEventListener('click', function () {
				thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
			});
			thisCart.dom.productList.addEventListener('updated', function () {
				thisCart.update();
			});
		}

		add(menuProduct) {
			const thisCart = this;
			const generatedHTML = templates.cartProduct(menuProduct);
			const generatedDOM = utils.createDOMFromHTML(generatedHTML);
			thisCart.dom.productList.appendChild(generatedDOM);
			thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
			thisCart.update();
		}

		update() {
			const thisCart = this;
			const deliveryFee = settings.cart.defaultDeliveryFee;
			let totalNumber = 0;
			let subtotalPrice = 0;

			for (let product of thisCart.products) {
				totalNumber += product.amount;
				subtotalPrice += product.price;
			}

			if (totalNumber > 0) {
				thisCart.totalPrice = subtotalPrice + deliveryFee;
				thisCart.dom.deliveryFee.innerHTML = deliveryFee;
			} else {
				thisCart.totalPrice = 0;
				thisCart.dom.deliveryFee.innerHTML = 0;
			}

			thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;
			thisCart.dom.totalNumber.innerHTML = totalNumber;

			for (let elem of thisCart.dom.totalPrice) {
				elem.innerHTML = thisCart.totalPrice;
			}
		}
	}

	class CartProduct {
		constructor(menuProduct, element) {
			const thisCartProduct = this;
			thisCartProduct.id = menuProduct.id;
			thisCartProduct.name = menuProduct.name;
			thisCartProduct.amount = menuProduct.amount;
			thisCartProduct.priceSingle = menuProduct.priceSingle;
			thisCartProduct.price = menuProduct.price;
			thisCartProduct.params = menuProduct.params;
			thisCartProduct.getElements(element);
			thisCartProduct.initAmountWidget();
		}

		getElements(element) {
			const thisCartProduct = this;
			thisCartProduct.dom = {};
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
			thisCartProduct.amountWidget = new AmountWidget(
				thisCartProduct.dom.amountWidget
			);
			thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
				thisCartProduct.amount = thisCartProduct.amountWidget.value;
				thisCartProduct.price =
					thisCartProduct.priceSingle * thisCartProduct.amount;
				thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
			});
		}
	}

	const app = {
		initData: function () {
			const thisApp = this;
			thisApp.data = dataSource;
		},
		initMenu: function () {
			const thisApp = this;
			for (let productId in thisApp.data.products) {
				new Product(productId, thisApp.data.products[productId]);
			}
		},
		initCart: function () {
			const thisApp = this;
			const cartElem = document.querySelector(select.containerOf.cart);
			thisApp.cart = new Cart(cartElem);
		},
		init: function () {
			const thisApp = this;
			thisApp.initData();
			thisApp.initMenu();
			thisApp.initCart();
		},
	};

	app.init();
}
