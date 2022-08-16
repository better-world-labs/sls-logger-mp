"use strict";
/*
 * @Author: Sandy
 * @Date: 2022-04-02 11:17:41
 * @LastEditTime: 2022-08-16 15:56:23
 * @Description: sls 日志直传 main文件
 */

Object.defineProperty(exports, "__esModule", { value: true });

function _typeof(obj) {
    "@babel/helpers - typeof";
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        _typeof = function _typeof(obj) {
            return typeof obj;
        };
    } else {
        _typeof = function _typeof(obj) {
            return obj &&
                typeof Symbol === "function" &&
                obj.constructor === Symbol &&
                obj !== Symbol.prototype
                ? "symbol"
                : typeof obj;
        };
    }
    return _typeof(obj);
}

function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}

function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}

function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}

var SlsLoggerMp =
    /*#__PURE__*/
    (function () {
        function SlsLoggerMp(opt) {
            _classCallCheck(this, SlsLoggerMp);

            var host = opt.host,
                project = opt.project,
                logstore = opt.logstore,
                time = opt.time,
                storageKey = opt.storageKey,
                count = opt.count;
            this.timer = null;
            this.contents_ = new Array();
            this.host = host; //所在区域的host
            this.project = project; //project名称
            this.logstore = logstore; //logstore名称
            this.time = time || 10; //定义时间，number类型
            this.count = count || 10; //定义数据条数，number类型
            this.storageKey = storageKey || "user_info"; //定义数据中要带入的缓存数据对象，string类型
            this.customer = {};
            this.arr = [];
            this.initSendLocalChunk();
            this.monitorPageClose();
        }

        _createClass(SlsLoggerMp, [
            {
                key: "monitorPageClose",
                value: function monitorPageClose() {
                    var _this = this;
                    uni.onAppHide(function () {
                        if (_this.arr.length > 0) {
                            var arrStore = JSON.stringify(_this.arr);
                            uni.setStorageSync("@sls-logger-chunk", arrStore);
                        }
                    });
                }
            },
            {
                key: "initSendLocalChunk",
                value: function initSendLocalChunk() {
                    var beforeLoggerChunk =
                        uni.getStorageSync("@sls-logger-chunk");

                    if (
                        beforeLoggerChunk !== null &&
                        typeof beforeLoggerChunk === "string"
                    ) {
                        try {
                            var arrStore = JSON.parse(beforeLoggerChunk);
                            this.logger(arrStore);
                            uni.removeStorageSync("@sls-logger-chunk");
                        } catch (e) {}
                    }
                }
            },
            {
                key: "getCustomerInfo",
                value: function getCustomerInfo() {
                    if (!this.customer.user_id || !this.customer.open_id) {
                        try {
                            var userInfo = uni.getStorageSync(this.storageKey);
                            this.customer = {
                                ...this.customer,
                                ...userInfo
                            };
                        } catch (e) {}
                    }
                    if (
                        !this.customer.device ||
                        !this.customer.device.device_id
                    ) {
                        try {
                            var deviceInfo = uni.getSystemInfoSync();
                            this.customer = {
                                ...this.customer,
                                device: {
                                    brand: deviceInfo.brand,
                                    model: deviceInfo.model,
                                    system: deviceInfo.system,
                                    device_id: deviceInfo.deviceId
                                }
                            };
                        } catch (e) {}
                    }
                    if (!this.customer.version) {
                        try {
                            var accountInfo = uni.getAccountInfoSync();
                            this.customer.device.version =
                                accountInfo.miniProgram.version;
                            this.customer.device.env =
                                accountInfo.miniProgram.envVersion;
                        } catch (e) {}
                    }
                }
            },
            {
                key: "createHttpRequest",
                value: function createHttpRequest(config, retry = true) {
                    uni.request({
                        ...config,
                        success: function () {},
                        fail: function () {
                            retry && createHttpRequest(config, false);
                        }
                    });
                }
            },
            {
                key: "logger",
                value: function logger() {
                    var arr =
                        arguments.length > 0 && arguments[0] !== undefined
                            ? arguments[0]
                            : this.arr;
                    var url =
                        "https://" +
                        this.project +
                        "." +
                        this.host +
                        "/logstores/" +
                        this.logstore +
                        "/track";

                    try {
                        var reqPayload = JSON.stringify({
                            __logs__: arr
                        });
                        var httpRequest_ = {
                            method: "POST",
                            url: url,
                            data: reqPayload,
                            header: {
                                // "Content-Type": "application/json;charset=utf8"
                                // "x-log-compresstype": "lz4"
                                "x-log-apiversion": "0.6.0",
                                "x-log-bodyrawsize": reqPayload.length
                            }
                        };
                        this.createHttpRequest(httpRequest_);
                    } catch (ex) {
                        if (console && typeof console.log === "function") {
                            console.log(
                                "Failed to log to ali log service because of this exception:\n" +
                                    ex
                            );
                            console.log("Failed log data:", url, arr);
                        }
                    }
                }
            },
            {
                key: "transString",
                value: function transString(obj) {
                    var newObj = {};

                    for (var i in obj) {
                        if (_typeof(obj[i]) == "object") {
                            newObj[i] = JSON.stringify(obj[i]);
                        } else {
                            newObj[i] = String(obj[i]);
                        }
                    }

                    return newObj;
                }
            },
            {
                key: "send",
                value: function send(originObj) {
                    try {
                        this.getCustomerInfo();
                        originObj.timestamp = new Date().getTime();
                        originObj = Object.assign(originObj, this.customer);
                        var obj = this.transString(originObj);

                        if (this.timer) {
                            this.arr.push(obj);

                            if (this.arr.length >= this.count) {
                                clearTimeout(this.timer);
                                this.timer = null;
                                this.logSending(this.arr);
                            }
                        } else {
                            var that = this;
                            this.arr.push(obj);
                            this.timer = setTimeout(function () {
                                that.logSending(that.arr);
                            }, this.time * 1000);
                        }
                    } catch (e) {}
                }
            },
            {
                key: "logSending",
                value: function logSending(content) {
                    try {
                        var accountInfo = uni.getAccountInfoSync(),
                            env = accountInfo.miniProgram.envVersion;
                        // 优化 开发环境和预览环境 日志不采集
                        // if (env === "develop" || env === "trial") return;
                    } catch (e) {}
                    if (content && content.length > 0) {
                        this.logger();
                        clearTimeout(this.timer);
                        this.timer = null;
                        this.arr = [];
                    }
                }
            }
        ]);

        return SlsLoggerMp;
    })();

module.exports = SlsLoggerMp;
