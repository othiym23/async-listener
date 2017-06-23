'use strict';

module.exports = (tap) => {
  return class SubclassedPromise extends Promise {
    then(onSuccess, onReject) {
      tap.type(onSuccess, 'function');
      tap.type(onReject, 'undefined');
      return super.then(onSuccess, onReject);
    }
  };
};
