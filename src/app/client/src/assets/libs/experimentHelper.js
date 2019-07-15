var userId = document.getElementById('userId') ? document.getElementById('userId').value : '';
var buildNumber = document.getElementById('buildNumber');
var portalVersion = buildNumber && buildNumber.value ? buildNumber.value.slice(0, buildNumber.value.lastIndexOf('.')) : '1.0';
var deviceRegisterApi = document.getElementById('deviceRegisterApi') ?
  document.getElementById('deviceRegisterApi').value : ''
var appId = document.getElementById('appId') ? document.getElementById('appId').value : 'portal';
EkTelemetry.getFingerPrint(function (deviceId) {
  console.log('meta data', userId, deviceRegisterApi, portalVersion, appId);
  if (userId || !deviceRegisterApi) {
    return;
  }
  showLoader();
  getExperimentDetails(deviceId, function (err, data) {
    removeLoader()
    if(err){
      return;
    }
    data = JSON.parse(data)
    if (data.result.experiment) {
      console.log('got data', data);
    }
  })
});
function getExperimentDetails(deviceId, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', deviceRegisterApi + deviceId);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function () {
    if (xhr.status == 200) {
      cb(null, xhr.responseText)
    } else {
      cb('error')
    }
  };
  xhr.send(JSON.stringify({
    id: appId,
    ver: portalVersion,
    ts: (new Date()).toISOString(),
    params: {
      msgid: Math.random().toString().slice(2)
    },
    request: {
      did: deviceId,
      ext: {
        userid: userId,
        url: window.location.href
      }
    }
  }));
}
function showLoader() {
  var style = document.createElement('style');
  style.innerHTML =
    '.loader {' +
    `border: 5px solid #f3f3f3;
    -webkit-animation: spin 1s linear infinite;
    animation: spin 1s linear infinite;
    border-top: 5px solid #555;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);` +
    '}' + `
    @-webkit-keyframes spin {
      0% { -webkit-transform: rotate(0deg); }
      100% { -webkit-transform: rotate(360deg); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }`;
  var ref = document.querySelector('.loader');
  ref.parentNode.insertBefore(style, ref);
}
function removeLoader(){
  var element = document.getElementById('loader');
  element.parentNode.removeChild(element);
}
