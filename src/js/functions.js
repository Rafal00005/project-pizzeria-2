/* global Handlebars */
/* eslint-disable no-unused-vars */

(function (global) {
  const utils = global.utils || (global.utils = {});

  utils.queryParams = function (params) {
    return Object.keys(params)
      .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
  };

  utils.numberToHour = function (number) {
    return (
      (Math.floor(number) % 24) + ':' + ((number % 1) * 60 + '').padStart(2, '0')
    );
  };

  utils.hourToNumber = function (hour) {
    const parts = hour.split(':');
    return parseInt(parts[0]) + parseInt(parts[1]) / 60;
  };

  utils.dateToStr = function (dateObj) {
    return dateObj.toISOString().slice(0, 10);
  };

  utils.addDays = function (dateStr, days) {
    const dateObj = new Date(dateStr);
    dateObj.setDate(dateObj.getDate() + days);
    return dateObj;
  };

  Handlebars.registerHelper('ifEquals', function (a, b, options) {
    return a == b ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('joinValues', function (input, options) {
    return Object.values(input).join(options.hash.separator);
  });
})(window);
