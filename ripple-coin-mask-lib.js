/**
 *  ____    _____   ____    ____    __       ______
 * |     \ |_   _| |     \ |     \ |  |     |   ___|
 * |     /   | |   |   __/ |   __/ |  |     |  |===
 * |     \  _| |_  |  |    |  |    |  |___  |  |___
 * |__|\__\|_____| |__|    |__|    |______| |______|
 *
 *    __    __      ___      _______     __  ___
 *   |  \  /  |    /   \    |   ___  \  |  |/  /
 *   |   \/   |   /     \   |  |__   |  |     /
 *   |        |  /  /-\  \  |  ___|  |  |     \
 *   |__|\/|__| /__/   \__\  \_______|  |__|\__\
 *
 * Author: Try-Parser
 * Date created: 08-04-2017
 * Requirements : {
 *   - : ripple-api
 *   - : lodash
 *   - : CryptoJS
 * }
 *
 * @params {
 *  address: "rJtu7cXkSTR3-----------------------",
 *  secret: "......",
 *  password: ".....",
 *  symbol: {
 *    mask: "FRK",
 *    new: "XRP"
 *  },
 *  server: "wss://s2.ripple.com",
 *  network: "private" // optional
 * }
 */
window.RippleMask = (function(){
  function RippleMask(obj) {
   var self = this;
   this._variables = obj;
   this._rippleAPI = new ripple.RippleAPI({server: obj.server});
   this.address = obj.address;
   this.network = obj.network;
   this._password = btoa(obj.password);
   this._secret = this._encrypt([obj.secret, obj.password]);
  }

  RippleMask.prototype.connect = function() {
   var self = this;
   return function(_) {
    self._rippleAPI.connect().then(function(){
      _(self);
    }).catch(self._error);
   }
  }

  RippleMask.prototype.checkNetwork = (typeof this.network != 'undefined')?false:true;

  /**
  * @params
  *   list = ["sample", "sample2"]
  *   comparam = "sample"
  *
  * @sample result true || false
  */
  RippleMask.prototype._checkList = function(list, comparam) {
   return _.includes(list, comparam);
  }

  /**
  * @params list = ["U2FsdGVkX1+X4Gr8Pc0+YTTMFFowNOXEBydA+abmaNA=", "passphrase"]
  *
  * @sample result = "phrase"
  */
  RippleMask.prototype._decrypt = function(list) {
   if(!this._checkList(list, ""))
    return CryptoJS.AES.decrypt(list[0], list[1]).toString(CryptoJS.enc.Utf8);
   else this._error(417)
  }

  /**
  * @params list = ["phrase", "passphrase"]
  *
  * @sample result = "U2FsdGVkX1+X4Gr8Pc0+YTTMFFowNOXEBydA+abmaNA="
  */
  RippleMask.prototype._encrypt = function(list) {
   if(!this._checkList(list, ""))
    return CryptoJS.AES.encrypt(list[0], list[1]).toString();
   else this._error(417)
  }

  /**
  * @params
  *    preparation object{}
  *    type = "order || trustline || payment"
  *    callback
  *
  * @sample result object{}
  */
  RippleMask.prototype._mask = function(preparation, type) {
   var self = this;
   return function(cb) {
    var maskedResponse = {};

    switch (type) {
      case 'order' :
       var maskedOrder = preparation;

       maskedOrder.quantity.currency = (
        preparation.quantity.currency == self._variables.symbol.mask &&
        self.checkNetwork
       ) ? self._variables.symbol.new : preparation.quantity.currency;

       maskedOrder.totalPrice.currency = (
        preparation.totalPrice.currency == self._variables.symbol.mask &&
        self.checkNetwork
       ) ? self._variables.symbol.new : preparation.totalPrice.currency;

       maskedResponse = maskedOrder;
       break;
      case 'payment' :
       var maskedPayment = preparation;

       maskedPayment.source.maxAmount.currency = (
        preparation.source.maxAmount.currency  == self._variables.symbol.mask &&
        self.checkNetwork
       ) ? self._variables.symbol.new : preparation.source.maxAmount.currency;

       maskedPayment.destination.maxAmount.currency = (
        preparation.destination.maxAmount.currency  == self._variables.symbol.mask &&
        self.checkNetwork
       ) ? self._variables.symbol.new : preparation.destination.maxAmount.currency;

       maskedResponse = maskedPayment;
       break;
      case 'setTrustline' :
       var maskedTrustline = preparation;

       maskedTrustline.currency = (
        preparation.currency == self._variables.symbol.mask && self.checkNetwork
       ) ? self._variables.symbol.new : preparation.currency;

       maskedResponse = maskedTrustline;
       break;
      case 'balances' :
       var maskedBalaces = _.map(preparation, function(balance) {
        var balanceHolder = balance;
        if(balance.currency == self._variables.symbol.new) {
          balanceHolder.currency = self._variables.symbol.mask;
        }
        return balanceHolder;
       });

       maskedResponse = maskedBalaces;
       break;
      case 'openOrders' :
       var maskedOrders = _.map(preparation, function(openOrder) {
        var specification = openOrder.specification,
           maskedOrder = openOrder;

        maskedOrder.specification.quantity.currency = (
          specification.quantity.currency == self._variables.symbol.new &&
          self.checkNetwork
        ) ? self._variables.symbol.mask : specification.quantity.currency;

        maskedOrder.specification.totalPrice.currency = (
          specification.totalPrice.currency == self._variables.symbol.new &&
          self.checkNetwork
        ) ? self._variables.symbol.mask : specification.totalPrice.currency;

        return maskedOrder;
       });

       maskedResponse = maskedOrders;
       break;
      case 'getTrustlines' :
       var maskedTrustline = _.map(preparation, function(trustline) {
        var trustlines = trustline;
        trustlines.specification.currency = (
          trustline.specification.currency == self._variables.symbol.new &&
          self.checkNetwork
        ) ? self._variables.symbol.mask : trustline.specification.currency;
        return trustlines;
       });

       maskedResponse = maskedTrustline;
       break;
      default: self._error(412);
    }

    cb(maskedResponse);
   }
  }

  /**
  * @params
  *   type = "522 || 417 || 412 || object{}"
  *
  * @output throw error type
  */
  RippleMask.prototype._error = function(type) {
   var errorResponse = {
    522: "Connection disconnected.",
    417: "List must not contained null or empty string.",
    412: "Invalid command"
   }

   throw (errorResponse[type])?errorResponse[type]:type;
  }

  /**
  * @params
  *   txJSON = "{
  *     \"Flags\":2147483648,
  *     \"TransactionType\":\"Payment\",
  *     \"Account\":\"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\",
  *     \"Destination\":\"rpZc4mVfWUif9CRoHRKKcmhu1nx2xktxBo\",
  *     \"Amount\":{
  *       \"value\":\"0.01\",
  *       \"currency\":\"USD\",
  *       \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *     },
  *     \"SendMax\":{
  *       \"value\":\"0.01\",
  *       \"currency\":\"USD\",
  *       \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *     },
  *     \"LastLedgerSequence\":8820051,
  *     \"Fee\":\"12\",\"Sequence\":23
  *   }"
  *   options -> optional
  *
  * @sample result = {
  *    "signedTransaction": "12000322800000002400000017201B00869553684000000000
  *      00000C732102F89EAEC7667B30F33D0687BBA86C3FE2A08CCA40A9186C5BDE2DAA6FA9
  *      7A37D874473045022100BDE09A1F6670403F341C21A77CF35BA47E45CDE974096E1AA5
  *      FC39811D8269E702203D60291B9A27F1DCABA9CF5DED307B4F23223E0B6F156991DB60
  *      1DFB9C41CE1C770A726970706C652E636F6D81145E7B112523F68D2F5E879DB4EAC51C
  *      6698A69304",
  *    "id": "02ACE87F1996E3A23690A5BB7F1774BF71CCBA68F79805831B42ABAD5913D6F4"
  * }
  */
  RippleMask.prototype.sign = function(txJSON, options = null) {
   var secret = this._decrypt([this._secret, atob(this._password)]),
      signedTransaction;

   if(options)
    signedTransaction = this._rippleAPI.sign(txJSON, secret);
   else
    signedTransaction = this._rippleAPI.sign(txJSON, secret, options);

   return signedTransaction;
  }

  /**
  * @params
  *  txJSON : "{
  *   \"Flags\":2147483648,
  *   \"TransactionType\":\"Payment\",
  *   \"Account\":\"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\",
  *   \"Destination\":\"rpZc4mVfWUif9CRoHRKKcmhu1nx2xktxBo\",
  *   \"Amount\":{
  *     \"value\":\"0.01\",
  *     \"currency\":\"USD\",
  *     \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *   },
  *   \"SendMax\":{
  *     \"value\":\"0.01\",
  *     \"currency\":\"USD\",
  *     \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *   },
  *   \"LastLedgerSequence\":8820051,
  *   \"Fee\":\"12\",\"Sequence\":23
  *  }"
  *  options = {}object -> optional
  *  callback
  *
  * @sample result = {
  *    "resultCode": "tesSUCCESS",
  *    "resultMessage": "The transaction was applied. Only final in a validated ledger."
  * }
  */
  RippleMask.prototype.signAndSubmit = function(txJSON, options = '') {
   var self = this;
   return function(_) {
    self.connect()(function(e){
      (options) ?
       e.submit(e.sign(txJSON).signedTransaction)(_) :
       e.submit(e.sign(txJSON, options).signedTransaction)(_);
    });
   }
  }

  /**
  * @params
  *  txBlob = '12000322800000002400000017201B0086955368400000
  *     000000000C732102F89EAEC7667B30F33D0687BBA86C3FE2A08CCA40A9186C5BDE2DAA6
  *     FA97A37D874473045022100BDE09A1F6670403F341C21A77CF35BA47E45CDE974096E1A
  *     A5FC39811D8269E702203D60291B9A27F1DCABA9CF5DED307B4F23223E0B6F156991DB6
  *     01DFB9C41CE1C770A726970706C652E636F6D81145E7B112523F68D2F5E879DB4EAC51C
  *     6698A69304'
  *  callback
  *
  * @sample result = {
  *    "resultCode": "tesSUCCESS",
  *    "resultMessage": "The transaction was applied. Only final in a validated ledger."
  * }
  */
  RippleMask.prototype.submit = function(txBlob) {
   var self = this;
   return function(_) {
    self.connect()
    (function(e){
      e._rippleAPI.submit(txBlob).then(_);
    });
   }
  }

  /**
  * @params
  *  tx = {
  *    order : {
  *      "direction": "buy",
  *      "quantity": {
  *        "currency": "USD",
  *        "counterparty": "rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM",
  *        "value": "10.1"
  *      },
  *      "totalPrice": {
  *        "currency": "XRP",
  *        "value": "2"
  *      },
  *      "passive": true,
  *      "fillOrKill": true
  *    },
  *    instructions: {} -> optional
  *  }
  *  callback
  *
  * @sample result = {
  *    "txJSON": "{
  *      \"Flags\":2147811328,
  *      \"TransactionType\":\"OfferCreate\",
  *      \"Account\":\"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\",
  *      \"TakerGets\":\"2000000\",
  *      \"TakerPays\":{
  *        \"value\":\"10.1\",
  *        \"currency\":\"USD\",
  *        \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *      },
  *      \"LastLedgerSequence\":8819954,
  *      \"Fee\":\"12\",
  *      \"Sequence\":23
  *    }",
  *    "instructions": {
  *      "fee": "0.000012",
  *      "sequence": 23,
  *      "maxLedgerVersion": 8819954
  *    }
  *  }
  */
  RippleMask.prototype.constructOrder = function(order, instructions = '')  {
   var api;
   return function(_) {
    self.connect()
    (function(e) {
      e._mask(order, 'order')
      (function(maskedOrder) {
       if(instructions)
        api = e._rippleAPI.prepareOrder(e.address, maskedOrder, instructions);
       else
        api = e._rippleAPI.prepareOrder(e.address, maskedOrder);

       api.then(_).catch(e._error);
      });
    });
   }
  }

  /**
  * @params
  *  tx = {
  *    payment : {
  *     "source": {
  *       "address": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
  *       "maxAmount": {
  *         "value": "0.01",
  *         "currency": "USD",
  *         "counterparty": "rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM"
  *       }
  *     },
  *     "destination": {
  *       "address": "rpZc4mVfWUif9CRoHRKKcmhu1nx2xktxBo",
  *       "amount": {
  *         "value": "0.01",
  *         "currency": "USD",
  *         "counterparty": "rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM"
  *       }
  *     }
  *    },
  *    instructions: {} -> optional
  *  }
  *  callback
  *
  * @sample result = {
  *   "txJSON": "{
  *     \"Flags\":2147483648,
  *     \"TransactionType\":\"Payment\",
  *     \"Account\":\"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\",
  *     \"Destination\":\"rpZc4mVfWUif9CRoHRKKcmhu1nx2xktxBo\",
  *     \"Amount\":{
  *       \"value\":\"0.01\",
  *       \"currency\":\"USD\",
  *       \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *    },
  *    \"SendMax\":{
  *      \"value\":\"0.01\",
  *      \"currency\":\"USD\",
  *      \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\"
  *    },
  *    \"LastLedgerSequence\":8820051,
  *    \"Fee\":\"12\",
  *    \"Sequence\":23
  *   }",
  *  "instructions": {
  *    "fee": "0.000012",
  *    "sequence": 23,
  *    "maxLedgerVersion": 8820051
  *  }
  * }
  */
  RippleMask.prototype.constructPayment = function(payment, instructions = '') {
   var self = this, api;
   return function(_) {
    self.connect()
    (function(e) {
      e._mask(payment, 'payment')
      (function(maskedPayment) {
       if(instructions)
        api = e._rippleAPI.preparePayment(e.address, maskedPayment, instructions);
       else
        api = e._rippleAPI.preparePayment(e.address, maskedPayment);

       api.then(_).catch(e._error);
      });
    });
   }
  }

  /**
  * @params
  *  tx = {
  *    trustline : {
  *     "currency": "USD",
  *     "counterparty": "rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM",
  *     "limit": "10000",
  *     "qualityIn": 0.91,
  *     "qualityOut": 0.87,
  *     "ripplingDisabled": true,
  *     "frozen": false,
  *     "memos": [
  *       {
  *         "type": "test",
  *         "format": "plain/text",
  *         "data": "texted data"
  *       }
  *     ]
  *    },
  *    instructions: {} -> optional
  *  }
  *  callback
  *
  * @sample result = {
  *  "txJSON": "{
  *    \"TransactionType\":\"TrustSet\",
  *    \"Account\":\"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\",
  *    \"LimitAmount\":{
  *        "currency\":\"USD\",
  *        \"issuer\":\"rMH4UxPrbuMa1spCBR98hLLyNJp4d8p4tM\",
  *        \"value\":\"10000\"
  *    },
  *    \"Flags\":2149711872,
  *    \"QualityIn\":910000000,
  *    \"QualityOut\":870000000,
  *    \"Memos\":[{
  *      \"Memo\":{
  *        \"MemoData\":\"7465787465642064617461\",
  *        \"MemoType\":\"74657374\",
  *        \"MemoFormat\":\"706C61696E2F74657874\"
  *        }
  *      }],
  *      \"LastLedgerSequence\":8820051,
  *      \"Fee\":\"12\",
  *      \"Sequence\":23
  *  }",
  *  "instructions": {
  *    "fee": "0.000012",
  *    "sequence": 23,
  *    "maxLedgerVersion": 8820051
  *  }
  * }
  */
  RippleMask.prototype.constructTrustLine = function(trustline) {
   var self = this, api;
   return function(_) {
    self.connect()
    (function(e){
      e._mask(tx.trustline, 'setTrustline')
      (function(maskedTrustline){
       if(tx.instructions)
        api = e._rippleAPI.prepareTrustline(e.address, maskedTrustline, instructions);
       else
        api = e._rippleAPI.prepareTrustline(e.address, maskedTrustline);

       api.then(_).catch(e._error);
      });
    });
   }
  }

  /**
  * @param
  *    callback
  *
  * @sample result =
  *   [{
  *      "value": "922.913243",
  *      "currency": "XRP"
  *    },{
  *       "value": "0",
  *       "currency": "ASP",
  *       "counterparty": "r3vi7mWxru9rJCxETCyA1CHvzL96eZWx5z"
  *   }]
  */
  RippleMask.prototype.getBalances = function(options = '') {
   var self = this, api;
   return function(_) {
    self.connect()
    (function(e) {
      if(options)
       api = e._rippleAPI.getBalances(e.address, options);
      else
       api = e._rippleAPI.getBalances(e.address);
      api.then(function(balances){
       e._mask(balances, 'balances')(_);
      }).catch(e._error);
    });
   }
  }

  /**
  * @param
  *    callback
  *
  * @sample result =
  *  [{"specification": {
  *    "direction": "sell",
  *    "quantity": {
  *      "currency": "EUR",
  *      "value": "17.70155237781915",
  *      "counterparty": "rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q"
  *    },
  *    "totalPrice": {
  *      "currency": "USD",
  *      "value": "1122.990930900328",
  *      "counterparty": "rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q"
  *    }
  *  },"properties": {
  *    "maker": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59",
  *    "sequence": 719930,
  *    "makerExchangeRate": "63.44025128030504"
  *  }}]
  */
  RippleMask.prototype.getOpenOrders = function(options = '') {
   var self = this, api;
   return function(_) {
    self.connect()
    (function(e) {
      if(options)
       api = e._rippleAPI.getOrders(e.address, options);
      else
       api = e._rippleAPI.getOrders(e.address);

      api.then(function(orders) {
       e._mask(orders, 'openOrders')(_);
      }).catch(e._error);
    });
   }
  }

  /**
  * @params
  *   callback
  *   options = {} object -> optional
  *
  * @sample result =
  *   [{
  *     "specification": {
  *      "limit": "5",
  *      "currency": "USD",
  *      "counterparty": "rMwjYedjc7qqtKYVLiAccJSmCwih4LnE2q",
  *      "ripplingDisabled": true,
  *      "frozen": true
  *    },
  *    "counterparty": {
  *      "limit": "0"
  *    },
  *    "state": {
  *      "balance": "2.497605752725159"
  *    }
  *  }]
  */
  RippleMask.prototype.getTrustline = function(options = '') {
   var self = this, api;
   return function(_) {
    self.connect()
    (function(e) {
      if(options)
       api = e._rippleAPI.getTrustlines(e.address, options);
      else
       api = e._rippleAPI.getTrustlines(e.address);

      api.then(function(trustlines) {
       e._mask(trustlines, 'getTrustlines')(_);
      }).catch(e._error);
    });
   }
  }

  return RippleMask;
})();
