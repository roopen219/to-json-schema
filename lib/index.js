'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

var merge = require('lodash.merge');

var isEqual = require('lodash.isequal');

var helpers = require('./helpers');

var defaultOptions = {
  required: false,
  postProcessFnc: null,
  strings: {
    detectFormat: true,
    preProcessFnc: null
  },
  arrays: {
    mode: 'all'
  },
  objects: {
    preProcessFnc: null,
    postProcessFnc: null,
    additionalProperties: true
  }
};
var skipReverseFind = ['hostname', 'host-name', 'alpha', 'alphanumeric', 'regex', 'regexp', 'pattern'];
var filteredFormats = helpers.stringFormats.filter(function (item) {
  return skipReverseFind.indexOf(item) < 0;
});

function getCommonTypeFromArrayOfTypes(arrOfTypes) {
  var lastVal;

  for (var i = 0, length = arrOfTypes.length; i < length; i++) {
    var currentType = arrOfTypes[i];

    if (i > 0) {
      if (currentType === 'integer' && lastVal === 'number') {
        currentType = 'number';
      } else if (currentType === 'number' && lastVal === 'integer') {
        lastVal = 'number';
      }

      if (lastVal !== currentType) return null;
    }

    lastVal = currentType;
  }

  return lastVal;
}

function getCommonArrayItemsType(arr) {
  return getCommonTypeFromArrayOfTypes(arr.map(function (item) {
    return helpers.getType(item);
  }));
}

var ToJsonSchema = /*#__PURE__*/function () {
  function ToJsonSchema(options) {
    _classCallCheck(this, ToJsonSchema);

    this.options = merge({}, defaultOptions, options);
    this.getObjectSchemaDefault = this.getObjectSchemaDefault.bind(this);
    this.getStringSchemaDefault = this.getStringSchemaDefault.bind(this);
    this.objectPostProcessDefault = this.objectPostProcessDefault.bind(this);
    this.commmonPostProcessDefault = this.commmonPostProcessDefault.bind(this);
    this.objectPostProcessDefault = this.objectPostProcessDefault.bind(this);
  }
  /**
   * Tries to find the least common schema that would validate all items in the array. More details
   * helpers.mergeSchemaObjs description
   * @param {array} arr
   * @returns {object|null}
   */


  _createClass(ToJsonSchema, [{
    key: "getCommonArrayItemSchema",
    value: function getCommonArrayItemSchema(arr) {
      var _this = this;

      var schemas = arr.map(function (item) {
        return _this.getSchema(item);
      }); // schemas.forEach(schema => console.log(JSON.stringify(schema, '\t')))

      return schemas.reduce(function (acc, current) {
        return helpers.mergeSchemaObjs(acc, current);
      }, schemas.pop());
    }
  }, {
    key: "getObjectSchemaDefault",
    value: function getObjectSchemaDefault(obj) {
      var _this2 = this;

      var schema = {
        type: 'object'
      };
      var objKeys = Object.keys(obj);

      if (objKeys.length > 0) {
        schema.properties = objKeys.reduce(function (acc, propertyName) {
          acc[propertyName] = _this2.getSchema(obj[propertyName]); // eslint-disable-line no-param-reassign

          return acc;
        }, {});
      }

      return schema;
    }
  }, {
    key: "getObjectSchema",
    value: function getObjectSchema(obj) {
      if (this.options.objects.preProcessFnc) {
        return this.options.objects.preProcessFnc(obj, this.getObjectSchemaDefault);
      }

      return this.getObjectSchemaDefault(obj);
    }
  }, {
    key: "getArraySchemaMerging",
    value: function getArraySchemaMerging(arr) {
      var schema = {
        type: 'array'
      };
      var commonType = getCommonArrayItemsType(arr);

      if (commonType) {
        schema.items = {
          type: commonType
        };

        if (commonType !== 'integer' && commonType !== 'number') {
          var itemSchema = this.getCommonArrayItemSchema(arr);

          if (itemSchema) {
            schema.items = itemSchema;
          }
        } else if (this.options.required) {
          schema.items.required = true;
        }
      }

      return schema;
    }
  }, {
    key: "getArraySchemaNoMerging",
    value: function getArraySchemaNoMerging(arr) {
      var schema = {
        type: 'array'
      };

      if (arr.length > 0) {
        schema.items = this.getSchema(arr[0]);
      }

      return schema;
    }
  }, {
    key: "getArraySchemaTuple",
    value: function getArraySchemaTuple(arr) {
      var _this3 = this;

      var schema = {
        type: 'array'
      };

      if (arr.length > 0) {
        schema.items = arr.map(function (item) {
          return _this3.getSchema(item);
        });
      }

      return schema;
    }
  }, {
    key: "getArraySchemaUniform",
    value: function getArraySchemaUniform(arr) {
      var schema = this.getArraySchemaNoMerging(arr);

      if (arr.length > 1) {
        for (var i = 1; i < arr.length; i++) {
          if (!isEqual(schema.items, this.getSchema(arr[i]))) {
            throw new Error('Invalid schema, incompatible array items');
          }
        }
      }

      return schema;
    }
  }, {
    key: "getArraySchema",
    value: function getArraySchema(arr) {
      if (arr.length === 0) {
        return {
          type: 'array'
        };
      }

      switch (this.options.arrays.mode) {
        case 'all':
          return this.getArraySchemaMerging(arr);

        case 'first':
          return this.getArraySchemaNoMerging(arr);

        case 'uniform':
          return this.getArraySchemaUniform(arr);

        case 'tuple':
          return this.getArraySchemaTuple(arr);

        default:
          throw new Error("Unknown array mode option '".concat(this.options.arrays.mode, "'"));
      }
    }
  }, {
    key: "getStringSchemaDefault",
    value: function getStringSchemaDefault(value) {
      var schema = {
        type: 'string'
      };

      if (!this.options.strings.detectFormat) {
        return schema;
      }

      var index = filteredFormats.findIndex(function (item) {
        return helpers.isFormat(value, item);
      });

      if (index >= 0) {
        schema.format = filteredFormats[index];
      }

      return schema;
    }
  }, {
    key: "getStringSchema",
    value: function getStringSchema(value) {
      if (this.options.strings.preProcessFnc) {
        return this.options.strings.preProcessFnc(value, this.getStringSchemaDefault);
      }

      return this.getStringSchemaDefault(value);
    }
  }, {
    key: "commmonPostProcessDefault",
    value: function commmonPostProcessDefault(type, schema, value) {
      // eslint-disable-line no-unused-vars
      if (this.options.required) {
        return merge({}, schema, {
          required: true
        });
      }

      return schema;
    }
  }, {
    key: "objectPostProcessDefault",
    value: function objectPostProcessDefault(schema, obj) {
      if (this.options.objects.additionalProperties === false && Object.getOwnPropertyNames(obj).length > 0) {
        return merge({}, schema, {
          additionalProperties: false
        });
      }

      return schema;
    }
    /**
     * Gets JSON schema for provided value
     * @param value
     * @returns {object}
     */

  }, {
    key: "getSchema",
    value: function getSchema(value) {
      var type = helpers.getType(value);

      if (!type) {
        throw new Error("Type of value couldn't be determined");
      }

      var schema;

      switch (type) {
        case 'object':
          schema = this.getObjectSchema(value);
          break;

        case 'array':
          schema = this.getArraySchema(value);
          break;

        case 'string':
          schema = this.getStringSchema(value);
          break;

        default:
          schema = {
            type: type
          };
      }

      if (this.options.postProcessFnc) {
        schema = this.options.postProcessFnc(type, schema, value, this.commmonPostProcessDefault);
      } else {
        schema = this.commmonPostProcessDefault(type, schema, value);
      }

      if (type === 'object') {
        if (this.options.objects.postProcessFnc) {
          schema = this.options.objects.postProcessFnc(schema, value, this.objectPostProcessDefault);
        } else {
          schema = this.objectPostProcessDefault(schema, value);
        }
      }

      return schema;
    }
  }]);

  return ToJsonSchema;
}();

function toJsonSchema(value, options) {
  var tjs = new ToJsonSchema(options);
  return tjs.getSchema(value);
}

module.exports = toJsonSchema;