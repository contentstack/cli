"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.sdk = void 0;
function sdk(mocData = {}, resolve = true) {
    const { findOneData, findData, countData, fetchData, downloadData } = mocData;
    const query = (param) => {
        return {
            find: () => {
                return Promise[resolve ? 'resolve' : 'reject'](findData);
            },
            count: () => {
                return Promise[resolve ? 'resolve' : 'reject'](countData);
            },
            findOne: () => {
                return Promise[resolve ? 'resolve' : 'reject'](findOneData);
            },
        };
    };
    const asset = (uid) => {
        return {
            query,
            download: () => Promise[resolve ? 'resolve' : 'reject'](downloadData),
        };
    };
    const stack = () => {
        return {
            query,
            asset,
            fetch: (param) => {
                return Promise[resolve ? 'resolve' : 'reject'](fetchData);
            },
        };
    };
    return { stack };
}
exports.sdk = sdk;
function client(mocData = {}, resolve = true) {
    return sdk(mocData, resolve).stack();
}
exports.client = client;
