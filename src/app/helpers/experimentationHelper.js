const request = require('request-promise');
const fs = require('fs');
const packageObj = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const moment = require('moment');
const uuidv1 = require('uuid/v1');
const envHelper = require('./environmentVariablesHelper.js');
// const experimentBaseUrl = envHelper.EXPERIMENT_BASE_URL;
const _ = require('lodash');

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
        console.log('fetching device register api failed', error.message);
    })
}

module.exports = {
    registerDeviceId
}