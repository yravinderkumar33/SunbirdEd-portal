const request = require('request-promise');
const fs = require('fs');
const packageObj = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const moment = require('moment');
const uuidv1 = require('uuid/v1');
const envHelper = require('./environmentVariablesHelper.js');
const dateFormat = require('dateformat');
const _ = require('lodash');
const experimentBlobUrl = 'http://localhost:3001/dist_experiment/';
// const experimentBaseUrl = envHelper.EXPERIMENT_BASE_URL;

const registerDeviceId = async (deviceId, deviceInfo) => {
    const options = {
        method: 'POST',
        url: envHelper.DEVICE_REGISTER_API + deviceId,
        headers: {},
        body: {
            id: envHelper.APPID,
            ver: packageObj.version,
            ts: moment().format(),
            params: {
                msgid: uuidv1()
            },
            request: {
                did: deviceId,
                producer: envHelper.APPID,
                uaspec: {
                    agent: deviceInfo.browser,
                    ver: deviceInfo.browser_version,
                    system: deviceInfo.os_version,
                    platform: deviceInfo.os,
                    raw: deviceInfo.userAgent
                }
            }
        },
        json: true
    }
    return request(options).then(apiResponse => {
        return apiResponse;
    }).catch(error => {
        console.log('fetching device register api failed', error);
        return {
            "id": "analytics.device-register",
            "ver": "1.0",
            "ts": dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss:lo'),
            "params": {
                "resmsgid": uuidv1(),
                "status": "failed",
                "client_key": null
            },
            "responseCode": "SERVER_ERROR",
            "result": {}
        }
    })
}

module.exports = {
    registerDeviceId
}